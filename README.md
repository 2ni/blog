### Deploy
```
ssh mouette; cd blog
git pull
node dist.js
```

### Coding Setup
```
mongod-local
npm run dev
mongosh
```

### Installation

#### nginx
Avoid timeouts!
```
proxy_read_timeout 600;
```

#### setup some folders
```
mkdir attachments
mkdir tmp
sudo chown -R www-data tmp
sudo chown -R www-data attachments
sudo chgrp -R www-data attachments
```

#### yt-dlp
Install yt-dlp in folder to make it accessible to www-data user (avoid EACCES error with spawn. The following commands can be run by denis.
The python virtualenv will be installed in the folder yt.
yt/bin must be part of the environment path in the file blog.service

```
pip3 install virtualenv
cd blog/
virtualenv -p python3 yt
yt/bin/pip install yt-dlp
```

#### nodejs
```
npm init -y
npm i express mongoose helmet express-handlebars compression i18n marked slugify method-override dompurify jsdom multer sharp dotenv cookie-parser
npm i --save-dev nodemon

npm outdated
npm update the.package
npm install the-package@5 # to upgrade to major version (eg from 4 to 5)
```
- add the following to packacke.json to allow esm syntax:
```
"type": "module"
```

#### prod
add the following on top of app.js:
```
#!/usr/bin/env node
```

run the following:
```
git clone
chmod a+x app.js
npm i
sudo cp blog.service /etc/systemd/system/
(if already copied once: sudo systemctl daemon-reload)
create .env file with TOKEN_SECRET

sudo systemctl [start|stop|restart] blog
sudo systemctl [enable|disable] blog        # to disable/enable  on boot
sudo systemctl list-unit-files --type=service      # to list if service starts on boot
journalctl -u blog -f                       # to show log output
journalctl -u blog.service                  # show logs
journalctl -u blog.service -b               # show logs from current boot
```

### Mongodb (localhost)
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
db.users.updateOne({email: "denis.demesmaeker@gmail.com"}, { $set: { role: "admin" } } )
db.pages.find({_id: ObjectId("62b6ffac2fff4a4a4845ac5b")})
db.sitemaps.drop()
db.showIndexes()
show collections
db.pages.deleteMany({})
db.pages.dropIndex("_id_")
db.dropDatabase()

db.articles.ensureIndex({ title: "text", markdown: "text" })  # create text index over title and content
db.articles.ensureIndex({ title: "text", markdown: "text" }, { weights: { title: 10, markdown: 5 } })  # create text index over title and content
db.articles.find({ $text: { $search: "\"article\"" } }, { score: { $meta: "textScore" } }).limit(2)
.sort({ score: { $meta: "textScore" } } )

db.articles.getIndexes()
db.articles.dropIndex("title_text_description_text")
db.pages.drop()
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
