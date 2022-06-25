### Installation
```
npm init -y
npm i express mongoose helmet express-handlebars compression i18n marked slugify method-override dompurify jsdom multer
npm i --save-dev nodemon
```
- add the following to packacke.json to allow esm syntax:
```
"type": "module"
```

### Mongodb
add aliases to your .zshrc:
```
alias mongod-local='mongod --dbpath `pwd`/dbdata'
alias mongod-start='brew services run mongodb-community'
alias mongod-status='brew services list | grep mongod'
alias mongod-stop='brew services stop mongodb-community'
```

### Run
```
npm run dev
```

