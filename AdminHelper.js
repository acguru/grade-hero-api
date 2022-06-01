let _ = require('lodash');
let {saveVoiceAttachments, saveFileAttachments} = require("../helpers/ProjectHelper")

module.exports =  {

renderNewData:async function(data, newdata){
    if (data.id) {
        newdata = await Project.findById(data.id).exec();
    }
    if(data.type) newdata.type = data.type;
    if(data.typeother) newdata.typeother = data.typeother;
    if(data.topic) newdata.topic = data.topic;
    if(data.subject) newdata.subject = data.subject;
    if(data.status) newdata.status = data.status;
    if(data.subjectother) newdata.subjectother = data.subjectother;
    if(data.startdate) newdata.startdate = data.startdate;
    if(data.enddate) newdata.enddate = data.enddate;
    if(data.pages) newdata.pages = data.pages;
    if(data.worldcount) newdata.worldcount = data.worldcount;
    if(data.pagefontspec) newdata.pagefontspec = data.pagefontspec;
    if(data.font) newdata.font= data.font;
    if(data.size) newdata.size= data.size;
    if(data.numberofsource) newdata.numberofsource = data.numberofsource;
    if(data.numberofscholarlysources) newdata.numberofscholarlysources = data.numberofscholarlysources;
    if(data.pagespacing) newdata.pagespacing = data.pagespacing;
    if(data.marginsize) newdata.marginsize = data.marginsize;
    if(data.citations) newdata.citations = data.citations;
    if(data.description) newdata.description = data.description;
    if(data.numberofsource) newdata.numberofsource = data.numberofsource;
    if(data.comments) newdata.comments = data.comments;
    if(data.grade) newdata.grade = data.grade;
    if(data.points) newdata.points = data.points;
    if(data.pricedetails) newdata.pricedetails = data.pricedetails
    if(data.price) newdata.price = data.price
    if(data.writercost) newdata.writercost = data.writercost;
    if(data.editorNote) newdata.editorNote = data.editorNote;
    if(data.editor) newdata.editor = data.editor;
    if(data.csNote) newdata.csNote = data.csNote;
    if(data.adminNote) newdata.adminNote= data.adminNote;
    if(data.writerNote) newdata.writerNote= data.writerNote;
    if(data.customerservice) newdata.customerservice = data.customerservice;
    if(data.acceptedByEditor) newdata.acceptedByEditor = data.acceptedByEditor;
    if(data.acceptedByWriter) newdata.acceptedByWriter = data.acceptedByWriter;
    newdata.preview30=[];
    if(data.preview30){
    let arr = await saveFileAttachments(data.preview30)
    arr.map((e) => {
        newdata.preview30.push(e)
    })
    }
    newdata.preview70=[];
    if(data.preview70){
    let s = await saveFileAttachments(data.preview70)
    s.map((e) => {
        newdata.preview70.push(e)
    })
    }
    newdata.finalpreview=[];
    if(data.finalpreview){
    let x = await saveFileAttachments(data.finalpreview)
    x.map((e) => {
        newdata.finalpreview.push(e)
    })
    }
    
    if(data.projectattachments) newdata.projectattachments= await saveFileAttachments(data.projectattachments);

    if(data.projectvoice) newdata.projectvoice= await saveVoiceAttachments(data.projectvoice);

    if (data.duedate && (data.duedate !== newdata.duedate)) {
        newdata.duedate = data.duedate
        if (newdata.progressdates) {
            for (let i =0; i<4; i++) {
                newdata.progressdates.pop() // remove old progressdates
            }
        }
        let start_date = new Date();
        if(newdata.createdAt) start_date = new Date(newdata.createdAt); // start date = now or createdAt date
        newdata.progressdates.push(start_date.getTime())
        newdata.progressdates.push((start_date.getTime() + ((new Date(newdata.duedate).getTime() - start_date.getTime()) * 0.3))) // 30%
        newdata.progressdates.push((start_date.getTime() + ((new Date(newdata.duedate).getTime() - start_date.getTime()) * 0.7))) // 70%
        newdata.progressdates.push((new Date(newdata.duedate).getTime()))
    }

    if (data.startdate && data.enddate) {
        if (newdata.progressdates) {
            for (let i =0; i<4; i++) {
                newdata.progressdates.pop()
            }
        }
        newdata.progressdates.push(new Date(newdata.startdate).getTime())
        newdata.progressdates.push((newdata.startdate.getTime() + ((new Date(newdata.enddate).getTime() - newdata.startdate.getTime()) * 0.3))) // 30%
        newdata.progressdates.push((newdata.startdate.getTime() + ((new Date(newdata.enddate).getTime() - newdata.startdate.getTime()) * 0.7))) // 70%
        newdata.progressdates.push((new Date(newdata.enddate).getTime()))
    }

    return newdata;
},

}