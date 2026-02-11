---
description: Steps to bundle and publish a new version of the LegitFlix plugin
---

# Publish Workflow

Follow these steps to prepare a new release.

## 1. Build the Client
Navigate to the `legitflix-client` directory and run the build:
```powershell
cd legitflix-client
npm run build
```

## 2. Version Bump
Update the version number (e.g., `1.0.0.34`) in the following files:

- **[csproj](file:///c:/Users/DaniPC/Desktop/Git%20repos/Legitflix-plugin/LegitFlix.Plugin/LegitFlix.Plugin.csproj)**: Update `AssemblyVersion` and `FileVersion`.
- **[meta.json](file:///c:/Users/DaniPC/Desktop/Git%20repos/Legitflix-plugin/LegitFlix.Plugin/meta.json)**: Update the `version` field.
- **[package_plugin.ps1](file:///c:/Users/DaniPC/Desktop/Git%20repos/Legitflix-plugin/LegitFlix.Plugin/package_plugin.ps1)**: Update the `$version` variable at the top.

## 3. Package the Plugin
// turbo
Run the packaging script from the `LegitFlix.Plugin` directory:
```powershell
cd LegitFlix.Plugin
powershell -ExecutionPolicy Bypass -File .\package_plugin.ps1
```
This script will:
- Build the C# project.
- Create a ZIP file.
- Generate a `manifest_snippet.json` containing the **MD5 Checksum**.

## 4. Update Manifests
Update the repository manifests with the new version, checksum, and changelog:

- **[manifest.json](file:///c:/Users/DaniPC/Desktop/Git%20repos/Legitflix-plugin/manifest.json)** (Root)
- **[manifest_utf8.json](file:///c:/Users/DaniPC/Desktop/Git%20repos/Legitflix-plugin/LegitFlix.Plugin/manifest_utf8.json)**

## 5. GitHub Release
1. Commit and push all changes to the repository.
2. Create a new release on GitHub tagged with the version (e.g., `v1.0.0.34`).
3. Upload the generated ZIP file to the release.
