# Contx Desktop

The Windows x64 setup executable includes the app runtime, compiler, native modules, and built-in SQLite storage. On a fresh PC, run the installer and sign in online to download an exam. The app saves the attempt and its submission queue in your Windows app-data directory.

Run the installed `ContxDesktop.exe --contx-check-setup` to check the compiler, native modules, and selected exam storage before starting an exam.

### Storage selection

The installed app reads optional settings from `offline-mysql.env` in its user-data directory. Development uses the project's `.env.local`. `CONTX_OFFLINE_STORAGE` accepts the following values.

- `auto` (default) uses the existing local MySQL connection when credentials are configured. On a fresh device it creates the built-in SQLite database.
- `embedded` uses SQLite, including on devices with MySQL settings.
- `mysql` requires the existing local MySQL database and its `CONTX_MYSQL_USER` and `CONTX_MYSQL_PASSWORD`. The optional `CONTX_MYSQL_DATABASE` and `CONTX_MYSQL_PORT` default to `contx_offline` and `3306`.

Complete and sync any active attempt before changing storage modes. If a configured MySQL connection fails, restore that connection to access attempts stored there.

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default {
  // other rules...
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json', './tsconfig.node.json'],
    tsconfigRootDir: __dirname,
  },
}
```

- Replace `plugin:@typescript-eslint/recommended` to `plugin:@typescript-eslint/recommended-type-checked` or `plugin:@typescript-eslint/strict-type-checked`
- Optionally add `plugin:@typescript-eslint/stylistic-type-checked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and add `plugin:react/recommended` & `plugin:react/jsx-runtime` to the `extends` list
