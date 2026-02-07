import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="app-layout">
      {children}
    </div>
  );
}

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="app-header">
      <h1 className="app-title">{title}</h1>
    </header>
  );
}

interface MainContentProps {
  toolbar: React.ReactNode;
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

export function MainContent({ toolbar, leftPanel, rightPanel }: MainContentProps) {
  return (
    <div className="app-main">
      <div className="app-toolbar-container">
        {toolbar}
      </div>
      <div className="app-panels">
        <div className="app-panel-left">
          {leftPanel}
        </div>
        <div className="app-panel-right">
          {rightPanel}
        </div>
      </div>
    </div>
  );
}
