# web-mplayer
Web interface for mpv player. This can be used to share a single music player in a room. 
The web interface can then be used to control the player from any device.

# features
- random playlist
- request songs
- vote on next or current song
- play soundbits for small announcements

# setup

## requirements
[MPV](https://mpv.io/) and [Mongodb](https://www.mongodb.com/)

## install
`npm install`

## config
You can configure the server using the files in the config folder.

Option        |Description                            |Type    |Default
--------------|---------------------------------------|--------|-------
port          |Port on which the web service runs     |int     |3003
musicDir      |Directory to scan for music            |string  |
blacklist     |Directories to skip scans (use / and relative paths)|string[]|[]
extensions    |Extensions of files to include         |string[]|['.aac','.ac3','.mp3','.wav','.wma','.m4a','.flac']
dbUrl         |Database connection url                |string  |'mongodb://localhost:27017'
dbName        |Database name                          |string  |'musiclib'
soundBitDir   |Sound bit directory                    |string  |./soundbits
soundBitVolume|Volume for playing soundbits           |int     |100     
playlistSize  |Size of the randomly generated playlist|int     |20      
nextDelay     |Delay for actually skipping song       |number  |10000   

# usage

1. start mongodb
2. start server: `npm start`

before the first start you should fill the database by running `npm run scan`

![screenshot](screenshot.png?raw=true)
