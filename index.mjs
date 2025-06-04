import { createRequire } from "module";
const require = createRequire(import.meta.url);

import fetch from 'node-fetch';
const sdk = require('api')('@front/v1.0.0#189xzg3o3klblhcee4');
const express = require('express')
const app = express()
var bodyParser = require('body-parser');
var useragent = require('express-useragent');
const crypto = require('crypto');

const clickupak = process.env.clickupak;
const clickupwhs = process.env.clickupwhs;
const clickupwhsCommentPost = process.env.clickupwhsCommentPost;
const clickupwhsTaskUpdated = process.env.clickupwhsTaskUpdated;
const clickupwhsTaskCreated = process.env.clickupwhsTaskCreated;
const clickupwhsTaskTimeTrackedUpdated = process.env.clickupwhsTaskTimeTrackedUpdated;
const clickupwhsTaskTimeEstimateUpdated = process.env.clickupwhsTaskTimeTimeEstimateUpdated;
const clickupWhsAssign = process.env.clickupWhsAssign;
const frontak = process.env.frontak;
const frontwhs = process.env.frontwhs;
const soField = process.env.sofield;
const timeRemainingFieldId = process.env.timeRemainingFieldId;
const timeRemainingWlFieldId = process.env.timeRemainingWlFieldId;
const rsDomain = process.env.rsdomain;
const designSpaceId = process.env.designSpaceId;
const itListId = process.env.itListId;
const transportListId = process.env.transportListId;
const tConvId = process.env.tConvId;
const frontCompletedTagId = process.env.frontCompletedTagId;
const workGroupFieldId = process.env.workGroupFieldId;
const valueIdPP = process.env.valueIdPP;
const valueIdWP = process.env.valueIdWP;
const valueIdEST = process.env.valueIdEST;

app.use(useragent.express());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

async function getTask(taskId, clickupak) {
    const query = new URLSearchParams({
    //   custom_task_ids: 'false',
    //   team_id: '',
      include_subtasks: 'true'
    }).toString();
  
    // const taskId = '860pbda4n';
    const resp = await fetch(
      `https://api.clickup.com/api/v2/task/${taskId}?${query}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: clickupak
        }
      }
    );
  
    const data = await resp.text();
    var task = JSON.parse(data);    
    return task;
  }

  async function getTaskComments(taskId, clickupak) {
    const query = new URLSearchParams({
    //   custom_task_ids: 'true',
    //   team_id: '123',
    //   start: '0',
    //   start_id: 'string'
    }).toString();
      
    const resp = await fetch(
      `https://api.clickup.com/api/v2/task/${taskId}/comment?${query}`,
      {
        method: 'GET',
        headers: {
          Authorization: clickupak
        }
      }
    );
  
    const data = await resp.text();
    const comment = JSON.parse(data);
    console.log("comment:");
    console.dir(comment, { depth: null });

    var comments = comment["comments"];
    let regex = /cnv_[a-zA-Z0-9]+/;
    for(var i=0;i<comments.length;i++){
        var commentText = comments[i]["comment_text"];
        console.log(commentText);
        if( commentText.includes("Front Conversation:") ){
            let result = regex.exec(commentText);
            if(result){
                console.log("Linked Front conversation:",result[0]);
                comment["front_conversation_id"] = result[0]
            }
        }
    }
    return comment;    
  }

async function addTaskAssignee(taskId, userId, clickupak) {
  const query = new URLSearchParams({
    // custom_task_ids: 'true',
    // team_id: '123'
  }).toString();
  
  const resp = await fetch(
    `https://api.clickup.com/api/v2/task/${taskId}?${query}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: clickupak
      },
      body: JSON.stringify({        
        assignees: {add: [userId]},        
      })
    }
  );
  
  const data = await resp.json();
  console.log("addTaskAssignee done:",data);
}

async function removeTaskAssignee(taskId, userId, clickupak) {
  const query = new URLSearchParams({
    // custom_task_ids: 'true',
    // team_id: '123'
  }).toString();
  
  const resp = await fetch(
    `https://api.clickup.com/api/v2/task/${taskId}?${query}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: clickupak
      },
      body: JSON.stringify({        
        assignees: {rem: [userId]},        
      })
    }
  );
  
  const data = await resp.json();
  console.log("addTaskAssignee done:",data);
}

app.all('/', (req, res) => {
    var ip = req.socket.remoteAddress;
    console.log("Just got a request!",ip,"param:",req.params,"body:");
    console.dir(req.body, { depth: null });
    
    res.send('Yo!')
})

app.all('/clickup-assign', async (req, res) => {
    var ip = req.socket.remoteAddress;
    console.log("clickup-assign",ip,"param:",req.params,"body:");
    console.log("clickupak.length:", clickupak.length);
    console.dir(req.body, { depth: null });
    var xSignature = req.get('X-Signature');
    console.log("X-Signature:",xSignature);
    var body = JSON.stringify(req.body);    
    const hash = crypto.createHmac('sha256', clickupWhsAssign).update(body);
    const signature = hash.digest('hex');
    console.log("hash:",hash);
    console.log("signature:",signature);

    if(xSignature==signature){
        
        var taskId = req.body["task_id"];
        const task = await getTask(taskId,clickupak);
        console.log("task:",task);        
        console.log("task id:",task["id"]);
        console.log("task assignees:",task["assignees"]);
        var spaceId = task["space"]["id"];
        // if(spaceId==designSpaceId){

          var subtasks = task["subtasks"];
          if(subtasks){
            for(var i=0;i<subtasks.length;i++){
              console.log("subtask",i,subtasks[i]["id"],subtasks[i]["name"]);
              if( subtasks[i]["name"].toUpperCase().includes("COMM REVIEW") || subtasks[i]["name"].toUpperCase().includes("COMMERCIAL REVIEW") || subtasks[i]["name"].toUpperCase().includes("CHECK") ){

              }else{
                var subtaskId = subtasks[i]["id"];
                switch(req.body["history_items"][0]["field"]){
                  case "assignee_add":
                    var updatedAssignee = req.body["history_items"][0]["after"];
                    console.log("updatedAssignee:",updatedAssignee);
                    console.log("assignee_add:",subtaskId,updatedAssignee["id"]);
                    await addTaskAssignee(subtaskId, updatedAssignee["id"], clickupak);
                    break;
                  case "assignee_rem":
                    var updatedAssignee = req.body["history_items"][0]["before"];
                    console.log("updatedAssignee:",updatedAssignee);
                    console.log("assignee_rem:",subtaskId,updatedAssignee["id"]);
                    await removeTaskAssignee(subtaskId, updatedAssignee["id"], clickupak);
                    break;
                  default:

                }            
              }
            }
          }

          var taskAssigneesEmails = []
          if(task["assignees"]){
            if(task["assignees"].length>0){
              taskAssigneesEmails = task["assignees"].map( x => x["email"] );
            }
          }
          console.log("taskAssigneesEmails:", taskAssigneesEmails);

          var clickupComment = await getTaskComments(taskId,clickupak);
          var frontConvId = clickupComment["front_conversation_id"];
          console.log("frontConvId:",frontConvId);
          if(frontConvId){
            await sdk.auth(frontak);

            var teammates;
            await sdk.getTeammates()
              .then( async ({ data }) => {
                console.log("Front teammates:",data["_results"].length);
                teammates = data["_results"];
                await sdk.getConversationById({conversation_id: frontConvId})
                  .then( async ({ data }) => {
                    console.log("Front conversation:");
                    // console.dir(data,{depth:null});
                    for(var i=0;i<taskAssigneesEmails.length;i++){
                      var filteredTeammates = teammates.filter(x => x["email"]==taskAssigneesEmails[i]);
                      console.log(i,"matched teammate:",filteredTeammates);
                      if(filteredTeammates.length>0){
                        var teammateId = filteredTeammates[0]["id"];
                        await sdk.patchConversationsConversation_id({assignee_id: teammateId}, {conversation_id: frontConvId})
                          .then(({ data }) => console.log(data))
                          .catch(err => console.error(err));
                      }                
                    }
                    if(taskAssigneesEmails.length==0){
                      console.log("taskAssigneesEmails.length==0");
                      await sdk.patchConversationsConversation_id({assignee_id: null}, {conversation_id: frontConvId})
                          .then(({ data }) => console.log(data))
                          .catch(err => console.error(err));
                    }
                  })
                  .catch(err => console.error(err));

              })
              .catch(err => console.error(err));              
          }

        // }
        
        res.send('authentication succeed');
    }else{
        res.send('Unauthorized request');
    }
    
})

function getTaskIdsFromFrontConversation(reqBody){
  var taskIds = [];
  for( var i=0;i<reqBody["conversation"]["links"].length;i++){
    var url = reqBody["conversation"]["links"][i]["external_url"];    
    let taskRegex = /\/t\/[a-zA-Z0-9]+/;
    let taskResult = taskRegex.exec(url);    
    if(taskResult){
      var taskId = taskResult[0].replace("\/t\/", "").trim();      
      taskIds.push(taskId);
    }
  }  
  return taskIds;
}

async function getListMembers(listId) {
  
  const resp = await fetch(
    `https://api.clickup.com/api/v2/list/${listId}/member`,
    {
      method: 'GET',
      headers: {
        Authorization: clickupak
      }
    }
  );

  const data = JSON.parse( await resp.text() );  
  return data;
}

app.all('/front-assign', async (req, res) => {
  var ip = req.socket.remoteAddress;
  console.log("Just got a request!",ip,"param:",req.params,"body:");
  console.dir(req.body, { depth: null });
  var xFrontSignature = req.get('X-Front-Signature');
  console.log("X-Front-Signature:",xFrontSignature);
  var bodyString = JSON.stringify(req.body);

  var validation = validateFrontSignature(req.body, xFrontSignature, frontwhs);
  console.log("validation:", validation);
  
  if(validation){
    if( req.body["conversation"]["assignee"]!=null ){
      var assignee = req.body["conversation"]["assignee"];
      var assigneeEmail = assignee["email"];
      var taskIds = getTaskIdsFromFrontConversation(req.body);
      var memberId = "";
      for(var i=0;i<taskIds.length;i++){
        var taskId = taskIds[i];
        console.log("taskId:",taskId);
        var task = await getTask(taskId,clickupak);            
        console.log("task:",task);
        var listId = task["list"]["id"];
        var spaceId = task["space"]["id"];
        console.log("list",listId);
        console.log("spaceId",spaceId);
        // if(spaceId==designSpaceId){
          if( memberId=='' ){
            var listMembers = await getListMembers(listId);          
            var matchMembers = listMembers["members"].filter( x => x["email"]==assigneeEmail );
            if( matchMembers.length>0 ){
              memberId = matchMembers[0]["id"];
              await addTaskAssignee(taskId, memberId, clickupak);
            }
          }
          var subtasks = task["subtasks"];
          console.log("subtasks",subtasks);
          if(subtasks){        
            for ( var subtask of subtasks){
              console.log("subtask",subtask);
              if( subtask["name"].toUpperCase().includes("COMM REVIEW") || subtask["name"].toUpperCase().includes("COMMERCIAL REVIEW") || subtask["name"].toUpperCase().includes("CHECK") ){
  
              }else{
                await addTaskAssignee(subtask["id"], memberId, clickupak);
              }          
            }
          }
        // }
        
      }      
    }
    res.send('authentication succeed');
  }else{
    res.send('Unauthorized request');
  }
  
})

app.all('/front-assignee-removed', async (req, res) => {
  var ip = req.socket.remoteAddress;
  console.log("Just got a request! /front-assignee-removed",ip,"param:",req.params,"body:");
  console.dir(req.body, { depth: null });
  var xFrontSignature = req.get('X-Front-Signature');
  console.log("X-Front-Signature:",xFrontSignature);
  var bodyString = JSON.stringify(req.body);

  var validation = validateFrontSignature(req.body, xFrontSignature, frontwhs);
  console.log("validation:", validation);
  
  if(validation){
    
    res.send('authentication succeed');
  }else{
    res.send('Unauthorized request');
  }
  
})


function validateFrontSignature(data, signature, apiSecret) {
  var hash = crypto.createHmac('sha1', apiSecret)
                   .update(JSON.stringify(data))
                   .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

async function setTaskField(taskId, fieldId, fieldValue){
  const query = new URLSearchParams({
    // custom_task_ids: 'true',
    // team_id: '123'
  }).toString();

  // const taskId = '860pwfgfd';
  // const fieldId = 'a5a50dec-2ab2-4210-b03a-bfec443fc1bb';
  const resp = await fetch(
    `https://api.clickup.com/api/v2/task/${taskId}/field/${fieldId}?${query}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: clickupak
      },
      body: JSON.stringify({
        value: fieldValue
      })
    }
  );

  const data = await resp.json();
  console.log(data);
}

app.all('/front-comment', async (req, res) => {
  var ip = req.socket.remoteAddress;
  console.log("Just got a request!",ip,"param:",req.params,"body:");
  console.dir(req.body, { depth: null });
  var xFrontSignature = req.get('X-Front-Signature');
  console.log("X-Front-Signature:",xFrontSignature);
  var bodyString = JSON.stringify(req.body);

  var validation = validateFrontSignature(req.body, xFrontSignature, frontwhs);
  console.log("validation:", validation);
  
  if(validation){
    var frontCommentText = req.body["target"]["data"]["body"];    
    console.log("frontCommentText:", frontCommentText);
    let regex = /\**S\/O Number:\**\s+\d+/;
    console.log("so pattern match:", regex.test(frontCommentText) );    
    if( regex.test(frontCommentText) )
    {
      let result = regex.exec(frontCommentText);
      let orderNumber = "";
      if(result){
        orderNumber = result[0].replace(/\**S\/O Number:\**\s+/, "").trim();
        console.log("orderNumber:", orderNumber);
      }
      
      var links = req.body["conversation"]["links"];
      console.log("links:", links);
      let taskRegex = /\/t\/[a-zA-Z0-9]+/;
      
      for(var i=0;i<links.length;i++){
        let taskResult = taskRegex.exec(links[i]["external_url"]);
        if(taskResult){
          var taskId = taskResult[0].replace("\/t\/", "").trim();
          console.log("taskId:", taskId);
          await setTaskField(taskId, soField, orderNumber);
          var task = await getTask(taskId, clickupak);
          var spaceId = task["space"]["id"];
          // if(spaceId==designSpaceId){
            var subtasks = task["subtasks"];
            for(var j=0;j<subtasks.length;j++){
              var subtaskId = subtasks[j]["id"];
              await setTaskField(subtaskId, soField, orderNumber);
            }
          // }
          
        }      
      }
    }

    res.send('authentication succeed');
  }else{
    res.send('Unauthorized request');
  }
  
})

async function getCustomFields(listId) {
  
  const resp = await fetch(
    `https://api.clickup.com/api/v2/list/${listId}/field`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: clickupak
      }
    }
  );

  const data = JSON.parse( await resp.text() );  
  return data;
}

app.all('/clickup-comment-post', async (req, res) => {
  var ip = req.socket.remoteAddress;
    console.log("clickup-comment-post",ip,"param:",req.params,"body:");
    console.log("clickupak.length:", clickupak.length);
    console.dir(req.body, { depth: null });
    var xSignature = req.get('X-Signature');
    console.log("X-Signature:",xSignature);
    var bodyText = JSON.stringify(req.body);    
    const hash = crypto.createHmac('sha256', clickupwhsCommentPost).update(bodyText);
    const signature = hash.digest('hex');
    console.log("hash:",hash);
    console.log("signature:",signature);

    if(xSignature==signature){
      var taskId = req.body["task_id"];
      var task = await getTask(taskId, clickupak);
      var spaceId = task["space"]["id"];
      // if(spaceId==designSpaceId){
        var comments = req.body["history_items"][0]["comment"]["comment"];
        console.log("comments:",comments);
        var frontConv = "";
        for(var i=0;i<comments.length;i++){
          console.log(`comment ${i}: ${comments[i]["text"]}`);
          var match = comments[i]["text"].match( /\/cnv_[a-zA-Z0-9]+/ );
          if (match !== null) {
            frontConv = match[0].substring(1);
            break;
          } 
        }      
        console.log(`frontConv: ${frontConv}`);
        if(frontConv!=""){
          await sdk.auth(frontak);
          await sdk.getConversationById({conversation_id: frontConv})
            .then( async ({ data }) => {
              console.dir(data,{depth:null});
              var recipient = data["recipient"];
              var recipientHandle = recipient["handle"];
              console.log(`recipientHandle: ${recipientHandle}`);
              if( recipientHandle.includes(rsDomain) ){
                
              }else{              
  
              }
                var recipientLink = recipient["_links"]["related"]["contact"];
                var match = recipientLink.match( /\/crd_[a-zA-Z0-9]+/ );
                if( match != null ){
                  var contactId = match[0].substring(1);
                  console.log(`contactId: ${contactId}`);
                  await sdk.getContactsContact_id({contact_id: contactId})
                  .then( async ({ data }) => {
                    console.dir(data, {depth:null});
                    if(data["account"]!=null){                    
                      if( "custom_fields" in data["account"] ){
                        if( "Account #" in data["account"]["custom_fields"]){
                          var accountNumber = data["account"]["custom_fields"]["Account #"];                        
                          
                          var task = await getTask(taskId, clickupak);                        
                          var customerFieldsList = task["custom_fields"].filter( x => x["name"]=="CUSTOMER");
                          if( customerFieldsList.length>0 ){
                            var customerField = customerFieldsList[0];
                            var filedId = customerField["id"];
                            var options = customerField["type_config"]["options"];
                            var matchOptions = options.filter( x => x["name"].includes(accountNumber) );
                            if(matchOptions.length>0){
                              console.log(`matchOption:`);
                              console.dir(matchOptions[0], {depth:null});
                              var valueID = matchOptions[0]["id"];
                              await setTaskField(taskId, filedId, valueID);
                            }
                          }
  
                        }
                      }
                    }
                  })
                  .catch(err => console.error(err));
                }
            })
            .catch(err => console.error(err));
  
        }
      // }
      
      res.send('authentication succeed');
    }else{
      res.send('Unauthorized request');
    }  
})

app.all('/clickup-task-updated', async (req, res) => {
  var ip = req.socket.remoteAddress;
    console.log("clickup-task-updated",ip,"param:",req.params,"body:");
    console.log("clickupak.length:", clickupak.length);
    console.dir(req.body, { depth: null });
    var xSignature = req.get('X-Signature');
    console.log("X-Signature:",xSignature);
    var bodyText = JSON.stringify(req.body);    
    const hash = crypto.createHmac('sha256', clickupwhsTaskUpdated).update(bodyText);
    const signature = hash.digest('hex');
    console.log("hash:",hash);
    console.log("signature:",signature);

    if(xSignature==signature){
      var taskId = req.body["task_id"];      
      var task = await getTask(taskId, clickupak);
      var spaceId = task["space"]["id"];
      // if(spaceId==designSpaceId){
        if( "history_items" in req.body){
          var field = req.body["history_items"][0]["field"];
          if( field == "custom_field" ){
            var fieldName = req.body["history_items"][0]["custom_field"]["name"];
            if( fieldName == "COMPLETE"){
              var afterId = req.body["history_items"][0]["after"];
              var completeOptions = req.body["history_items"][0]["custom_field"]["type_config"]["options"].filter( x => x["name"]=="COMPLETE");
              if( completeOptions.length>0 ){
                var completeOptionId = completeOptions[0]["id"];
                console.log(`afterId:${afterId} completeOptionId:${completeOptionId} `);
                if( afterId == completeOptionId ){
                  var clickupComment = await getTaskComments(taskId,clickupak);
                  var frontConvId = clickupComment["front_conversation_id"];
                  console.log("frontConvId:",frontConvId);
                  if(frontConvId){
                    await sdk.auth(frontak);                              
                    await sdk.postConversationsConversation_idTags({tag_ids: [frontCompletedTagId]}, {conversation_id: frontConvId})
                    .then(({ data }) => console.log(data))
                    .catch(err => console.error(err));
                  }
                }
              }
            }
          }        
        }
      // }
      
      
      
      res.send('authentication succeed');
    }else{
      res.send('Unauthorized request');
    }  
})

app.all('/clickup-time-track-updated', async (req, res) => {
  var ip = req.socket.remoteAddress;
    console.log("clickup-time-track-updated",ip,"param:",req.params,"body:");
    console.log("clickupak.length:", clickupak.length);
    console.dir(req.body, { depth: null });
    var xSignature = req.get('X-Signature');
    console.log("X-Signature:",xSignature);
    var bodyText = JSON.stringify(req.body);    
    const hash = crypto.createHmac('sha256', clickupwhsTaskTimeTrackedUpdated).update(bodyText);
    const signature = hash.digest('hex');
    console.log("hash:",hash);
    console.log("signature:",signature);

    if(xSignature==signature){
      var taskId = req.body["task_id"];
      const task = await getTask(taskId,clickupak);
      console.log("task:",task);
      var listId = task["list"]["id"];
      if(listId==transportListId){
        var customFields = task["custom_fields"];
        var filedsTimeRemaining = customFields.filter( x => x["id"]==timeRemainingFieldId);
        if(filedsTimeRemaining.length>0){
          var timeRemainingVal = filedsTimeRemaining[0]["value"];
          console.log("timeRemainingVal:",timeRemainingVal);
          await setTaskField(taskId, timeRemainingWlFieldId, timeRemainingVal);
        }
      }
      
      res.send('authentication succeed');
    }else{
      res.send('Unauthorized request');
    }  
})

app.all('/clickup-task-time-estimate-updated', async (req, res) => {
  var ip = req.socket.remoteAddress;
    console.log("clickup-task-time-estimate-updated",ip,"param:",req.params,"body:");
    console.log("clickupak.length:", clickupak.length);
    console.dir(req.body, { depth: null });
    var xSignature = req.get('X-Signature');
    console.log("X-Signature:",xSignature);
    var bodyText = JSON.stringify(req.body);    
    const hash = crypto.createHmac('sha256', clickupwhsTaskTimeEstimateUpdated).update(bodyText);
    const signature = hash.digest('hex');
    console.log("hash:",hash);
    console.log("signature:",signature);

    if(xSignature==signature){
      var taskId = req.body["task_id"];
      const task = await getTask(taskId,clickupak);
      console.log("task:",task);
      var listId = task["list"]["id"];
      if(listId==transportListId){
        var customFields = task["custom_fields"];
        var filedsTimeRemaining = customFields.filter( x => x["id"]==timeRemainingFieldId);
        if(filedsTimeRemaining.length>0){
          var timeRemainingVal = filedsTimeRemaining[0]["value"];
          console.log("timeRemainingVal:",timeRemainingVal);
          await setTaskField(taskId, timeRemainingWlFieldId, timeRemainingVal);
        }
      }
      
      res.send('authentication succeed');
    }else{
      res.send('Unauthorized request');
    }  
})

app.all('/clickup-task-created', async (req, res) => {
  var ip = req.socket.remoteAddress;
    console.log("clickup-task-created",ip,"param:",req.params,"body:");
    console.log("clickupak.length:", clickupak.length);
    console.dir(req.body, { depth: null });
    var xSignature = req.get('X-Signature');
    console.log("X-Signature:",xSignature);
    var bodyText = JSON.stringify(req.body);    
    const hash = crypto.createHmac('sha256', clickupwhsTaskCreated).update(bodyText);
    const signature = hash.digest('hex');
    console.log("hash:",hash);
    console.log("signature:",signature);

    if(xSignature==signature){
      var taskId = req.body["task_id"];
      const task = await getTask(taskId,clickupak);
      console.log("task:",task);
      var listId = task["list"]["id"];
      if(listId==transportListId){
        var customFields = task["custom_fields"];
        var filedsTimeRemaining = customFields.filter( x => x["id"]==timeRemainingFieldId);
        if(filedsTimeRemaining.length>0){
          var timeRemainingVal = filedsTimeRemaining[0]["value"];
          console.log("timeRemainingVal:",timeRemainingVal);
          await setTaskField(taskId, timeRemainingWlFieldId, timeRemainingVal);
        }
      }

      var clickupComment = await getTaskComments(taskId,clickupak);
      console.log("clickupComment:",clickupComment);
      var frontConvId = clickupComment["front_conversation_id"];
      if(frontConvId){
        await sdk.auth(frontak);                              
        await sdk.getConversationById({conversation_id: frontConvId})
        .then(({ data }) => {
          console.log(data);
          var tags = data["tags"];
          for(var i=0;i<tags.length;i++){
            if(tags[i]["name"].includes("ASM")){
              var asm = tags[i]["name"].replace("ASM=", "").trim();
              var valueId;
              if( ["KH","DA","KN"].includes(asm) ){
                valueId = valueIdWP;
              }
              if( ["TP","NB"].includes(asm) ){
                valueId = valueIdPP;
              }
              if(valueId){
                console.log("set work group field:",workGroupFieldId,"valueId:",valueId);
                setTaskField(taskId, workGroupFieldId, valueId)
                  .then(() => console.log("Work group field updated successfully"))
                  .catch(err => console.error("Error updating work group field:", err));
                var subtasks = task["subtasks"];
                if(subtasks){
                  for(var i=0;i<subtasks.length;i++){
                    console.log("subtask",i,subtasks[i]["id"],subtasks[i]["name"]);
                    var subtaskId = subtasks[i]["id"];
                    setTaskField(subtaskId, workGroupFieldId, valueId)
                    .then(() => console.log("Work group field updated successfully"))
                    .catch(err => console.error("Error updating work group field:", err));
                  }
                }
                break;
              }
            }
          }
        })
        .catch(err => console.error(err));
      }
      
      res.send('authentication succeed');
    }else{
      res.send('Unauthorized request');
    }  
})

app.all('/clickup-test', async (req, res) => {
  var ip = req.socket.remoteAddress;
    console.log("clickup-test",ip,"param:",req.params,"body:");
    console.log("clickupak.length:", clickupak.length);
    console.dir(req.body, { depth: null });
    var xSignature = req.get('X-Signature');
    console.log("X-Signature:",xSignature);
    var bodyText = JSON.stringify(req.body);    
    const hash = crypto.createHmac('sha256', clickupwhsTaskUpdated).update(bodyText);
    const signature = hash.digest('hex');
    console.log("hash:",hash);
    console.log("signature:",signature);

    if(xSignature==signature){            
      
      res.send('authentication succeed');
    }else{
      res.send('Unauthorized request');
    }  
})

app.listen(process.env.PORT || 3000)