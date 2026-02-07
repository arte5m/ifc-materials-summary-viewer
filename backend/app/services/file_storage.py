"""
File storage service for managing uploaded IFC files.
Uses JSON-based metadata storage with file cleanup on shutdown.
"""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any


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

        self._metadata: Dict[str, Dict[str, Any]] = {}
        self._load_metadata()

    def _load_metadata(self):
        """Load metadata from JSON file."""
        if self.metadata_file.exists():
            try:
                with open(self.metadata_file, "r") as f:
                    self._metadata = json.load(f)
            except (json.JSONDecodeError, IOError):
                self._metadata = {}
        else:
            self._metadata = {}

    def _save_metadata(self):
        """Save metadata to JSON file."""
        try:
            with open(self.metadata_file, "w") as f:
                json.dump(self._metadata, f, indent=2)
        except IOError:
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

    def delete_file(self, file_id: str) -> bool:
        """
        Delete a file and its metadata (IFC, GLB, JSON mapping).

        Args:
            file_id: Unique identifier of the file

        Returns:
            True if deleted successfully, False otherwise
        """
        if file_id not in self._metadata:
            return False

        info = self._metadata[file_id]

        # Delete IFC file
        file_path = info.get("file_path")
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass

        # Delete GLB file
        glb_path = info.get("glb_path")
        if glb_path and os.path.exists(glb_path):
            try:
                os.remove(glb_path)
            except OSError:
                pass

        # Delete JSON mapping file
        json_path = info.get("json_path")
        if json_path and os.path.exists(json_path):
            try:
                os.remove(json_path)
            except OSError:
                pass

        # Remove metadata including skipped_ids
        del self._metadata[file_id]
        self._save_metadata()

        return True

    def cleanup_all(self):
        """
        Delete all uploaded files (IFC, GLB, JSON) and clear metadata.
        Called on application shutdown.
        """
        try:
            # Delete all .glb files
            for f in self.uploads_dir.glob("*.glb"):
                try:
                    f.unlink()
                except OSError:
                    pass

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

            # Clear in-memory metadata
            self._metadata = {}

        except Exception:
            pass

    def file_exists(self, file_id: str) -> bool:
        """
        Check if a file exists.

        Args:
            file_id: Unique identifier of the file

        Returns:
            True if file exists, False otherwise
        """
        return self.get_file_path(file_id) is not None

    def get_all_file_ids(self) -> list:
        """
        Get list of all stored file IDs.

        Returns:
            List of file IDs
        """
        return list(self._metadata.keys())

    def get_glb_path(self, file_id: str) -> Path:
        """
        Get path for cached GLB file.

        Args:
            file_id: Unique identifier of the file

        Returns:
            Path to the GLB file
        """
        return self.uploads_dir / f"{file_id}.glb"

    def delete_glb(self, file_id: str) -> bool:
        """
        Delete cached GLB file.

        Args:
            file_id: Unique identifier of the file

        Returns:
            True if deleted or didn't exist, False on error
        """
        glb_path = self.get_glb_path(file_id)
        if glb_path.exists():
            try:
                glb_path.unlink()
                # Remove from metadata
                if file_id in self._metadata:
                    self._metadata[file_id].pop("glb_path", None)
                    self._save_metadata()
                return True
            except OSError:
                return False
        return True

    def save_glb_path(self, file_id: str, glb_path: Path):
        """
        Save GLB file path to metadata.

        Args:
            file_id: Unique identifier of the file
            glb_path: Path to the GLB file
        """
        if file_id in self._metadata:
            self._metadata[file_id]["glb_path"] = str(glb_path)
            self._save_metadata()

    def save_json_path(self, file_id: str, json_path: str):
        """
        Save JSON mapping file path to metadata.

        Args:
            file_id: Unique identifier of the file
            json_path: Path to the JSON mapping file
        """
        if file_id in self._metadata:
            self._metadata[file_id]["json_path"] = json_path
            self._save_metadata()

    def save_skipped_ids(self, file_id: str, skipped_ids: list):
        """
        Save skipped element IDs to metadata.

        Args:
            file_id: Unique identifier of the file
            skipped_ids: List of element IDs that failed GLB conversion
        """
        if file_id in self._metadata:
            self._metadata[file_id]["skipped_ids"] = skipped_ids
            self._save_metadata()

    def get_skipped_ids(self, file_id: str) -> list:
        """
        Get skipped element IDs from metadata.

        Args:
            file_id: Unique identifier of the file

        Returns:
            List of skipped element IDs, or empty list if none
        """
        return self._metadata.get(file_id, {}).get("skipped_ids", [])

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

    def get_material_summary(self, file_id: str) -> list | None:
        """
        Get cached material summary from metadata.

        Args:
            file_id: Unique identifier of the file

        Returns:
            Material summary list, or None if not cached
        """
        return self._metadata.get(file_id, {}).get("material_summary")


# Global instance for easy access
_file_storage_instance: Optional[FileStorage] = None


def get_file_storage() -> FileStorage:
    """Get or create the global FileStorage instance."""
    global _file_storage_instance
    if _file_storage_instance is None:
        _file_storage_instance = FileStorage()
    return _file_storage_instance
