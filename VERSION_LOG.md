# Version Log

## Version 1.0.0 (Initial Release)

-   **Features:**
    -   Initial release of the Electron application.
    -   View, create, edit, and delete documents and folders in a tree-like structure.
    -   Document versioning: every save creates a new version.
    -   Full-text search (backend support, UI to be implemented).
    -   Application built with Electron, React, esbuild, and Tailwind CSS.
-   **Database:**
    -   SQLite database with a schema designed for versioned documents and a hierarchical structure.
    -   Uses the Closure Table pattern for efficient tree traversal.
-   **Build:**
    -   Configured `electron-builder` to create a Windows installer.
