//Business logic
const fs = require('fs');
const File = require('../models/File');
const config = require('config');

class FileService {
    createDir(req, file) {
        //const filePath = `${config.get('filePath')}\\${file.user}\\${file.path}`;
        //const filePath = `${config.get('filePath')}/${file.user}/${file.path}`;
        const filePath = this.getPath(req, file);
        console.log("filepath " + filePath);
        return new Promise(((resolve, reject) => {
            try {
                if (!fs.existsSync(filePath)) {
                    fs.mkdirSync(filePath, { recursive: true });
                    return resolve({ message: "File was created" })
                } else {
                    return reject({ message: "File allready exists" })
                }
            } catch (error) {
                return reject({ message: 'File error' });
            }
        }))
    }

    deleteFile(req, file) {
        const path = this.getPath(req, file);
        if(file.type === 'dir') {
            fs.rmdirSync(path);
        } else {
            fs.unlinkSync(path);
        }
    }

    getPath(req, file){
        return `${req.filePath}/${file.user}/${file.path}`;
        
    }
}

module.exports = new FileService();
