# Portus – A fork of [Tab Harbor](https://github.com/V-IOLE-T/tab-harbor) with bookmark support

[English](README.md) | [简体中文](README.zh-CN.md)

## Bookmark Support

Portus integrates your browser bookmarks directly into the "Quiet Desk" workspace, providing a seamless way to access and organize your library without leaving your new tab.

- **Hierarchical Navigation**: Browse your entire bookmark library with a clean, folder-based view and intuitive breadcrumb trails.
- **Drag & Drop Reordering**: Organize your bookmarks exactly how you want them by dragging items to new positions.
- **Move to Folder**: Easily organize your library by dragging bookmarks or folders onto breadcrumbs or other folder chips to move them.
- **Integrated Management**: Open bookmarks in new tabs or delete them (including entire folder trees) with a single click and safety confirmation.
- **One-click Bookmarking**: Quickly save any Quick Link to your browser bookmarks with a single click from the dashboard.
- **Design Consistent**: The bookmarks view follows the project's calm, editorial aesthetic, featuring theme-aware styling and smooth transitions.

## 💻 Installation

1. Clone this branch:

   ```bash
   git clone -b feat/bookmark https://github.com/jhcao1024/tab-harbor
   ```

2. Open `chrome://extensions`
3. Turn on **Developer mode**
4. Click **Load unpacked**
5. Select the [`extension/`](extension/) folder
6. Open a new tab

## 🔒 Fully Local

Tab Harbor runs entirely inside the extension. Open tabs come directly from Chrome, and saved reads, todos, quick links, theme preferences, and layout state stay on your machine through `chrome.storage.local`.

If you publish this repo for other people, they get the code and assets, not your personal browsing data.

## 🛠️ Under the Hood

This is a Manifest V3 Chrome extension with a plain frontend stack and no build step required to use it. You can clone it, load it, and start using it without npm, without a dev server, and without standing up anything else.

## 🙏 Acknowledgements
- Portus is based on [Tab Harbor](https://github.com/V-IOLE-T/tab-harbor) with additional support for bookmarks.
## 📄 License

MIT License
