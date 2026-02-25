"""
File storage service for managing uploaded IFC files.
Uses JSON-based metadata storage with file cleanup on shutdown.
"""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Optional


class FileStorage:
    """Manages uploaded IFC files with persistent storage and cleanup."""

    def __init__(
        self, uploads_dir: Optional[str] = None, metadata_file: Optional[str] = None
    ):
        """
        Initialize file storage.

        Args:
            uploads_dir: Directory to store uploaded files (default: backend/uploads/)
            metadata_file: Path to metadata JSON file (default: backend/uploads/metadata.json)
        """
        if uploads_dir is None:
            # Get the backend directory (parent of app/)
            backend_dir = Path(__file__).parent.parent.parent
            uploads_dir = str(backend_dir / "uploads")

        self.uploads_dir = Path(uploads_dir)
        self.uploads_dir.mkdir(exist_ok=True)

        if metadata_file is None:
            self.metadata_file = self.uploads_dir / "metadata.json"
        else:
            self.metadata_file = Path(metadata_file)

        self._metadata: dict[str, dict[str, Any]] = {}
        self._load_metadata()

    def _load_metadata(self):
        """Load metadata from JSON file."""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file) as f:
                    self._metadata = json.load(f)
            except (OSError, json.JSONDecodeError):
                self._metadata = {}
        else:
            self._metadata = {}

    def _save_metadata(self):
        """Save metadata to JSON file."""
        try:
            with open(self.metadata_file, "w") as f:
                json.dump(self._metadata, f, indent=2)
        except OSError:
            pass

    def save_file(self, file_content: bytes, original_filename: str) -> str:
        """
        Save uploaded file and return file_id.

        Args:
            file_content: Binary content of the file
            original_filename: Original name of the uploaded file

        Returns:
            file_id: Unique identifier for the stored file
        """
        file_id = str(uuid.uuid4())
        stored_filename = f"{file_id}.ifc"
        file_path = self.uploads_dir / stored_filename

        # Write file content
        with open(file_path, "wb") as f:
            f.write(file_content)

        # Store metadata
        self._metadata[file_id] = {
            "file_path": str(file_path),
            "original_filename": original_filename,
            "stored_filename": stored_filename,
            "upload_time": datetime.now().isoformat(),
            "size_bytes": len(file_content),
        }
        self._save_metadata()

        return file_id

    def get_file_path(self, file_id: str) -> Optional[str]:
        """
        Get the file path for a given file_id.

        Args:
            file_id: Unique identifier of the file

        Returns:
            Path to the file if it exists, None otherwise
        """
        if file_id not in self._metadata:
            return None

        file_path = self._metadata[file_id].get("file_path")
        if file_path and os.path.exists(file_path):
            return file_path
        return None

    def get_original_filename(self, file_id: str) -> Optional[str]:
        """
        Get the original filename for a given file_id.

        Args:
            file_id: Unique identifier of the file

        Returns:
            Original filename if it exists, None otherwise
        """
        if file_id not in self._metadata:
            return None
        return self._metadata[file_id].get("original_filename")

    def cleanup_all(self):
        """
        Delete all uploaded files (IFC, Fragments, JSON) and clear metadata.
        Called on application shutdown.
        """
        try:
            # Delete all .json files (including metadata.json)
            for f in self.uploads_dir.glob("*.json"):
                try:
                    f.unlink()
                except OSError:
                    pass

            # Delete all .ifc files
            for f in self.uploads_dir.glob("*.ifc"):
                try:
                    f.unlink()
                except OSError:
                    pass

            # Delete all .frag files
            for f in self.uploads_dir.glob("*.frag"):
                try:
                    f.unlink()
                except OSError:
                    pass

            # Clear in-memory metadata
            self._metadata = {}

        except Exception:
            pass

    def get_material_summary(self, file_id: str) -> list | None:
        """
        Get cached material summary from metadata.

        Args:
            file_id: Unique identifier of the file

        Returns:
            Material summary list, or None if not cached
        """
        return self._metadata.get(file_id, {}).get("material_summary")

    def save_material_summary(self, file_id: str, summary: list):
        """
        Save material summary to metadata.

        Args:
            file_id: Unique identifier of the file
            summary: Material summary list
        """
        if file_id in self._metadata:
            self._metadata[file_id]["material_summary"] = summary
            self._save_metadata()


# Global instance for easy access
_file_storage_instance: Optional[FileStorage] = None


def get_file_storage() -> FileStorage:
    """Get or create the global FileStorage instance."""
    global _file_storage_instance
    if _file_storage_instance is None:
        _file_storage_instance = FileStorage()
    return _file_storage_instance
