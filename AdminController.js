let ImageManager = require("../helpers/ImageManager")
let Response = require("../helpers/Response")
let Security = require("../helpers/Security");
let cheerio = require("cheerio")
const DomainChecker = require("../helpers/DomainChecker");
const Manager = require("../models/Manager");
let AdminHelper = require("../helpers/AdminHelper");
let Chathelpers = require("../socket/Chathelpers");
const ManagerType = require("../models/ManagerType");

module.exports = {

    /**
    * @route POST /admin/login
    * @desc Login as a Manager
    * @param {Object} req.body - Login data
    * @returns {String} Generated Token
    */
    managerlogin: async function (req, res) {
        const data =  req.body;
        const username =  data.username;
        const password =  data.password;
        const response = await Manager.findOne({username: username}).populate('managertype').exec()
        if(response && response.username){
            response.comparePassword(password, async function (valid) {
                if (!valid) return Response.notOk(res,'Invalid password');
                response.lastlogin = Date.now();
                await response.save();
                return res.ok({
                    managertype:response.managertype.name,
                    id:response._id,
                    token: await Security.generateToken(response._id, response.full_name, 1,response.managertype.name,true),
                });

            });

        }else{
            return res.forbidden("user not found");
        }

    },

    /**
    * @route POST /admin/signup
    * @desc SignUp Applicant
    * @param {Object} req.body - Applicant data
    * @returns {String} Success or Failure
    */
    applicantSignup:async function (req, res) {
        const data =  req.body;
        const firstName =  data.firstName;
        const lastName =  data.lastName;
        const email = data.email;
        const password = data.password;
        const phone = data.phone;
        const role = data.role;
        const id = data.id;
        const resume = data.resume;

        let count1 = await Applicant.countDocuments({'username':email}).exec();
        let count2 = await Manager.countDocuments({'username':email}).exec();
        
        if(count1>0 || count2>0){
            return Response.notOk(res,"Email already found");
        }
        
        count1 = await Applicant.countDocuments({'phone':phone}).exec();
        count2 = await Manager.countDocuments({'phone':phone}).exec();
        
        if(count1>0 || count2>0){
            return Response.notOk(res,"Phone already found");
        }
        
        const validEmail = await DomainChecker.validateDns(email)
        if (!validEmail) {
            return Response.notOk(res,"Domain name is not valid")
        }
        let applicant = new Applicant()
        applicant.full_name = firstName +" "+ lastName;
        applicant.username = email;
        applicant.password = password;
        applicant.phone = phone;
        applicant.managertype = role;
        applicant.resume = await ImageManager.uploadimagebase64row(resume.base64, resume.ext);
        applicant.id = await ImageManager.uploadimagebase64row(id.base64, id.ext);
        try{
        applicant.save(async function (error, applicant) {
            if (error) return Response.notOk(res,"data error",error);
            return Response.ok(res, applicant);
        });
        }catch (e) {
        return Response.notOk(res,"otp code Error");
        }

    },

    /**
    * @route Get /admin/managertype/list
    * @desc List Manager's Type
    * @param {Object} req.body - empty
    * @returns {ManagerType[]} ManagerType List 
    */
    listmanagertype:async function (req, res) {
        const items = await ManagerType.find().sort({ "$natural": -1 }).exec();
        return res.ok(items);
    },

    /**
    * @route Get /admin/manager/list
    * @desc List Manager
    * @param {Object} req.body - empty
    * @returns {ManagerType[]} Manage List 
    */
    listmanager:async function (req, res) {
        const items = await Manager.find().populate('managertype').sort({ "$natural": -1 }).exec();
        return Response.ok(res,
            items
        );
    },

    /**
    * @route Get /admin/project/list
    * @desc List Project
    * @param {Object} req.body - empty
    * @returns {Project[]} Project List 
    */
    adminlistproject:async function (req, res) {
        const items = await Project.find().populate(["user","projectattachments","projectvoice","writer","room","preview30","preview70", "finalpreview"]).sort({ "$natural": -1 }).exec();
        if (items) {
            const currentdate = Date.now()
            for (let i =0; i<items.length; i++) {
                if (currentdate >= items[i].progressdates[3]) {
                  items[i].progresstatus = 100 // 100 % of the time 
                } else if (currentdate >= items[i].progressdates[2]) {
                  items[i].progresstatus = 70 // 70 % of the time 
                } else if (currentdate >= items[i].progressdates[1]) {
                  items[i].progresstatus = 30 // 30 % of the time 
                }
                await items[i].save()
            }
        }
        return Response.ok(res, items);
    },
    
    /**
    * @route Get /admin/article/list
    * @desc List Article
    * @param {Object} req.body - empty
    * @returns {Article[]} Article List 
    */
    adminlistarticle:async function (req, res) {
        const items = await Article.find().sort({ "$natural": -1 }).exec();
        return Response.ok(res, items);
    },

    /**
    * @route Post /admin/project/submitPricing
    * @desc Submit Pricing Project
    * @param {Object} req.body._id - Project id
    * @returns {Project} Submitted Project 
    */
    submitPricingProject: async function(req, res) {
        const data = req.body;
        data.id = data._id;
        let newdata = new Project();
        newdata = await AdminHelper.renderNewData(data, newdata);
        newdata.editor = data.editor;
        newdata.acceptedByEditor = 0; // When the project is rejected by editor and resubmitted
        newdata.status = 3; // After Pricing Status
        await newdata.save();
        return Response.ok(res, newdata);
    },

    /**
    * @route Post /admin/project/sendBackProject
    * @desc Sent Back Project
    * @param {Object} req.body._id - Project id
    * @returns {Project} Project Sent Back
    */
    sendBackProject: async function (req,res) {// Internal sendback for example from editor to writer, CS to editor or admin to CS
        const data = req.body;
        data.id = data._id;
        let newdata = new Project();
        newdata = await AdminHelper.renderNewData(data, newdata);
       
        if (data.stage == 0) {  // stage 1
            newdata.submit30 = newdata.submit30-1;
          } else if (data.stage == 1){  // stage 2
            newdata.submit70 = newdata.submit70-1;
          } else {  // stage 3
            newdata.submit_final = newdata.submit_final-1;
          }
        
        await newdata.save();
        
        return Response.ok(res, newdata);
    },


    /**
    * @route Post /admin/project/submitProject
    * @desc Submit Project
    * @param {Object} req.body._id - Project id
    * @returns {Project} Submitted Project 
    */
    submitProject: async function (req, res) {// Internal submit form example from writer to editor, editor to CS or CS to admin
        const data = req.body;
        data.id = data._id;
        let newdata = new Project();
        newdata = await AdminHelper.renderNewData(data, newdata);
        if(data.stage == 0) { // stage 1
            newdata.submit30 = data.submit30+1;
            if(newdata.submit30 == 4){
            newdata.stage = data.stage+1;
            }
        }
        else
        if(data.stage == 1){ // stage 2
            newdata.submit70 = data.submit70+1;
            if(newdata.submit30 == 4) {
                newdata.stage = data.stage+1;
            }
        }
        else{ // stage 3
            newdata.submit_final = data.submit_final+1;
            if(newdata.submit_final == 4){
                newdata.stage = data.stage+1;
                newdata.status = 2;
            }
        }
        await newdata.save();
        return Response.ok(res,newdata);
    },

    /**
    * @route Post /admin/project/rejectEditor
    * @desc Reject Editor Project
    * @param {Object} req.body._id - Project id
    * @returns {Project} Rejected Project 
    */
    rejectEditorProject : async function (req, res) {
        const data = req.body;
        data.id = data._id;
        let newdata = new Project();
        newdata = await AdminHelper.renderNewData(data, newdata);
        newdata.editor = null;
        newdata.status = 1; // Pending Status
        newdata.acceptedByEditor = -1;
        await newdata.save();
        return Response.ok(res, newdata);
    },

    /**
    * @route Post /admin/project/acceptEditor
    * @desc Accpet Editor Project
    * @param {Object} req.body._id - Project id
    * @returns {Project} Accepted Project 
    */
    acceptEditorProject : async function (req, res) {
        const data = req.body;
        data.id = data._id;
        let newdata = new Project();
        newdata = await AdminHelper.renderNewData(data, newdata);
        newdata.acceptedByEditor = 1;
        newdata.editor = data.editor;
        data.suggested_writers.map((e) => {
            newdata.suggested_writers.push(e.value)
        });
        let manager;
        while (true) {// assign User-Editor room for the project
                let count = await Manager.countDocuments().exec();
                let random = Math.floor(Math.random() * count);
                manager = await Manager.findOne().skip(random).populate('managertype').exec() // choose random editor
                if (manager.managertype.name === 'editor') {
                    break
                }
            }
        let roominfo = await Chathelpers.saveRoom(newdata.user,manager._id,newdata.topic,newdata._id);
        newdata.room = roominfo.id;
        await newdata.save();
        return Response.ok(res,newdata);
    },

    /**
    * @route Post /admin/project/acceptWriter
    * @desc Accpet Writer Project
    * @param {Object} req.body._id - Project id
    * @returns {Project} Accepted Project 
    */
    acceptWriterProject: async function (req, res) {
        const data = req.body;
        data.id = data._id;
        let newdata = new Project();
        newdata = await AdminHelper.renderNewData(data, newdata);
        if(newdata.acceptedByWriter==1){
            return Response.notOk(res, "job was taken")
        }
        else{
        newdata.acceptedByWriter = 1;
        newdata.writer = data.writer;
        await newdata.save();
        return Response.ok(res,newdata);
        }
    },

    /**
    * @route Post /admin/project/save
    * @desc Add or Update A Project
    * @param {Object} req.body._id - Project id
    * @returns {Project} Project 
    */
    projectAddorUpdate: async function (req, res) {
        const data = req.body;
        data.id = data._id;
        let newdata = new Project();
        newdata = await AdminHelper.renderNewData(data,newdata);
        await newdata.save();
        return Response.ok(res,newdata);
    },


    /**
    * @route Post /admin/article/save
    * @desc Add or Update An Article
    * @param {Object} req.body._id - Article id
    * @returns {Article} Article
    */
    articleAddorUpdate: async function (req, res) {
        const data = req.body;
        let newdata = new Article();
        if (data._id.length >1) {
            newdata = await Article.findById(data._id).exec()
        }
        newdata.title = data.title;
        newdata.content = data.content;
        newdata.profilepic = await ImageManager.uploadimagebase64row(data.profilepic, 'png')
        newdata.contentpic = await ImageManager.uploadimagebase64row(data.contentpic, 'png')
        newdata.contenttitle = data.contenttitle 
        const $ = cheerio.load(data.content);
        const text = $.text()
        newdata.contentdecsription = text.substring(0,100) + "..."
        await newdata.save();
        return Response.ok(res);
    },

    /**
    * @route Post /admin/project/delete/:id
    * @desc Delete Project
    * @param {Object} req.body.id - Project id
    * @returns {String} status
    */
    adminprojectdelete: function (req, res) {
        const id = req.params.id;
        Project.findById(id, async function (error, data) {
            if (error) return res.serverError(error);
            if (!data) return res.notFound();
            data.remove(function (error) {
                if (error) return res.serverError(error);
                return res.ok();
            });

        });
    },
};
