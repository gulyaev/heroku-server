const fileService = require('../services/fileService');
const User = require('../models/User');
const File = require('../models/File');
const config = require('config');
const fs = require('fs');
const Uuid = require('uuid');

class FileController {
    async createDir(req, res) {
        try {
            const { name, type, parent } = req.body;
            const file = new File({ name, type, parent, user: req.user.id });
            const parentFile = await File.findOne({ _id: parent });
            if (!parentFile) {
                file.path = name;
                await fileService.createDir(req, file);
            } else {
                file.path = `${parentFile.path}/${parentFile.name}`;
                await fileService.createDir(req, file);
                parentFile.childs.push(file._id);
                await parentFile.save();
            }
            await file.save();
            return res.json(file);
        } catch (error) {
            console.log(error);
            return res.status(400).json(error);
        }
    }

    async getFiles(req, res) {
        try {
            const { sort } = req.query;
            let files = null;

            switch (sort) {
                case 'name':
                    files = await File.find({ user: req.user.id, parent: req.query.parent }).sort({ name: -1 });
                case 'type':
                    files = await File.find({ user: req.user.id, parent: req.query.parent }).sort({ type: -1 });
                case 'date':
                    files = await File.find({ user: req.user.id, parent: req.query.parent }).sort({ date: -1 });

                default:
                    files = await File.find({ user: req.user.id, parent: req.query.parent });
                    break;
            }

            return res.json({ files });
        } catch (e) {
            console.log(e);
            return res.status(500).json({ message: "Can not get files" });
        }
    }

    async uploadFile(req, res) {
        try {
            const file = req.files.file;
            //const file = req.body.file;
            //const fileParsed = JSON.parse(file);
            console.log(file);

            const parent = await File.findOne({ user: req.user.id, _id: req.body.parent });
            const user = await User.findOne({ _id: req.user.id });


            if (user.usedSpace + file.size > user.diskSpace) {
                return res.status(400).json({ message: "No space on the disk" })
            }

            user.usedSpace = user.usedSpace + file.size;

            let path, pathUserId, pathUserIdAndParent;
            if (parent) {
                //pathUserIdAndParent = `${config.get('filePath')}/${user._id}/${parent.path}`;
                pathUserIdAndParent = `${req.filePath}/${user._id}/${parent.path}`;
                path = `${req.filePath}/${user._id}/${parent.path}/${file.name}`;
            } else {
                pathUserId = `${req.filePath}/${user._id}`;
                path = `${req.filePath}/${user._id}/${file.name}`;
            }

            if (fs.existsSync(path)) {
                return res.status(400).json({ message: 'File allready existsрпр' });
            }
            else {
                if (parent) {
                    fs.mkdirSync(pathUserIdAndParent, { recursive: true });
                    file.mv(path);
                } else {
                    fs.mkdirSync(pathUserId, { recursive: true });
                    file.mv(path);
                }
            }
            //const type = fileParsed.name.split('.').pop();
            const type = file.name.split('.').pop();
            let filePath = file.name;
            if (parent) {
                filePath = `${parent.path}/${file.name}`
            }
            const dbFile = new File({
                name: file.name,
                type,
                size: file.size,
                path: filePath,
                parent: parent ? parent._id : null,
                user: user._id
            });

            await dbFile.save();
            await user.save();

            res.json(dbFile);
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: "Upload error" });
        }
    }

    async downloadFile(req, res) {
        try {
            const file = await File.findOne({ _id: req.query._id, user: req.user.id });
            console.log("file" + file.name);
            const path = `${req.filePath}/${req.user.id}/${file.path}/${file.name}`;

            if (fs.existsSync(path)) {
                return res.download(path, file.name);
            }
            return res.status(400).json({ message: "Download error" });

        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Download error" });
        }
    }

    async deleteFile(req, res) {
        try {
            const file = await File.findOne({ _id: req.query.id, user: req.user.id });
            if (!file) {
                return res.status(400).json({ message: "File not found" });
            }
            fileService.deleteFile(req, file);
            await file.remove();
            return res.json({ message: "File was deleted" });
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Dir is not empty" });
        }
    }

    async searchFile(req, res) {
        try {
            const searchName = req.query.search;
            let files = await File.find({user: req.user.id});
            files = files.filter(file => file.name.includes(searchName));
            return res.json(files);
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Search error" });
        }
    }

    async uploadAvatar(req, res) {
        try {
            const file = req.files.file;
            const user = await User.findById(req.user.id);
            const avatarName = Uuid.v4() + ".jpg";
            file.mv(`${config.get('staticPath')}/${avatarName}`);
            user.avatar = avatarName;
            await user.save();
            //return res.json({message: "Awatar was uploaded"});
            return res.json(user);
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Upload avatar error" });
        }
    }

    async deleteAvatar(req, res) {
        try {
            const user = await User.findById(req.user.id);
            fs.unlinkSync(`${config.get('staticPath')}/${user.avatar}`);
            user.avatar = null;
            await user.save();
            return res.json(user);
        } catch (error) {
            console.log(error);
            res.status(400).json({ message: "Delete avatar error" });
        }
    }
}

module.exports = new FileController();