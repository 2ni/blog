### Installation
```
npm init -y
npm i express mongoose helmet express-handlebars compression i18n marked slugify method-override dompurify jsdom multer sharp dotenv cookie-parser
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
### mongodb shell commands
```
select blog
db.categories.insertOne({ "name": "electronics" })
db.pages.find({}, { "title": 1, "url": 1, "attachments": 1, "markdown": 1 })
db.pages.updateOne({_id: ObjectId("62b6ffac2fff4a4a4845ac5b")}, { $set : {"attachments": [] }}, { multi: true})
db.pages.find({_id: ObjectId("62b6ffac2fff4a4a4845ac5b")})
db.sitemaps.drop()
db.showIndexes()
show collections
db.pages.deleteMany({})
db.pages.dropIndex("_id_")
db.dropDatabase()
```

### Authentication
```
https://github.com/WebDevSimplified/Nodejs-User-Authentication
https://github.com/WebDevSimplified/JWT-Authentication
Authorization Code flow with PKCE
```

- create random ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET to save in .env
```
node
> require("crypto").randomBytes(64).toString("hex")
```
