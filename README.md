# dorm_menu_api

## Commands

```shell
yarn start: start server
yarn cli: excute some options, plz read the cli help.
```

## API v2

### API Routing

#### /api/v2/menus

```plain
GET: / => Get Menus.
Params: year, month, date
Response[JSON]: Result
```

#### /api/v2/is_saved_menu

```plain
GET: / => Get IsSavedMenu.
Params: year, month
Response[JSON]: Boolean(true / false)
```
