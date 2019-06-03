function getAuthType() {
  var cc = DataStudioApp.createCommunityConnector();
  return cc.newAuthTypeResponse()
    .setAuthType(cc.AuthType.USER_PASS)
    .setHelpUrl('https://www.rankwatch.com/connector-auth-help')
    .build();
}

function resetAuth() {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('dscc.username');
  userProperties.deleteProperty('dscc.password');
}

function isAuthValid() {
  var userProperties = PropertiesService.getUserProperties();
  var userName = userProperties.getProperty('dscc.username');
  var password = userProperties.getProperty('dscc.password');
  return validateCredentials(userName, password);
}


function setCredentials(request) {
  var creds = request.userPass;
  var username = creds.username;
  var password = creds.password;

  var validCreds = checkForValidCreds(username, password);
  if (!validCreds) {
    return {
      errorCode: 'INVALID_CREDENTIALS'
    };
  }
  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('dscc.username', username);
  userProperties.setProperty('dscc.password', password);
  return {
    errorCode: 'NONE'
  };
}

function validateCredentials(username, password) {
  var rawResponse = UrlFetchApp.fetch('https://apiv2dev.rankwatch.com/user/profile/json/', {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(username + ':' + password)
    }
  });
  content = JSON.parse(rawResponse);
  return content['errno'] == 0;
}

function checkForValidCreds(username, password) {
  var rawResponse = UrlFetchApp.fetch('https://apiv2dev.rankwatch.com/user/profile/json/', {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(username + ':' + password)
    }
  });
  content = JSON.parse(rawResponse);
  return content['errno'] == 0;
}

function getConfig(request) {
  var cc = DataStudioApp.createCommunityConnector();
  var config = cc.getConfig();
  
  var userProperties = PropertiesService.getUserProperties();
  username = userProperties.getProperty('dscc.username');
  password = userProperties.getProperty('dscc.password');
  
  var rawResponse = UrlFetchApp.fetch('https://apiv2dev.rankwatch.com/project/list/json/', {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + Utilities.base64Encode(username + ':' + password)
    }
  });
  var content = JSON.parse(rawResponse.getContentText());
  
  config.newInfo()
    .setId('instructions')
    .setText('Select the Project name you wish to connect to this Data Source. Please note that the Search Engine IDs are mentioned with your project.');
  
  var selected = config.newSelectSingle()
  .setId("projectId")
  .setName("Select Your Project")
  .setHelpText("Select the project you wish to analyze.")
  .setAllowOverride(false)
  
  content['data']['total_rows_returned'].forEach(function(project){
    selected.addOption(config.newOptionBuilder().setLabel(project['project_name'] + " - ("+project['url']+" - "+project['search_engines']+")").setValue(project['project_id']));
  });
  
    config.newInfo()
    .setId('instructions')
    .setText('Enter one of the Search Engine ID mentioned in the project selected above. Example: Project Name (www.example.com - 2,3) Enter 2 or 3 as Search Engine ID');
  
  config.newTextInput()
    .setId('sId')
    .setName('Enter Search Engine Id')
    .setHelpText('e.g. 1.00002')
    .setPlaceholder('Search Engine ID');
  
  config.setDateRangeRequired(false);
  
  return config.build();
}
function isAdminUser() {
  return true;
}


function getSchema() {
  Logger.log("getting schema");
  
  s = {
    schema: [
      {
        'name': "keyword", 
        label: "Keyword", 
        isDefault: true,
        dataType:"STRING", 
        semantics: {
          conceptType: 'DIMENSION'
        }
      },
      {
        'name': 'ranked_url', 
        label: "Ranked URL", 
        dataType: "STRING", 
        semantics:{
          conceptType: 'DIMENSION'
        }
      },
      {
        'name': "url", 
        label: "URL", 
        dataType:"STRING", 
        semantics:{
          conceptType: 'DIMENSION'
        }
      },
      {
        'name': "p_id", 
        label: "Project ID", 
        dataType:"STRING", 
        semantics:{
          conceptType: 'DIMENSION'
        }
      },
      {
        'name': "initial_rank", 
        label: "Initial Rank", 
        dataType:"NUMBER", 
        semantics: {
          conceptType: 'METRIC'
        }
      },
      {
        'name': "current_rank", 
        label: "Current Rank", 
        dataType:"NUMBER", 
        semantics: {
          conceptType: 'METRIC'
        }
      },
      {
        'name': "highest_rank", 
        label: "Highest Rank", 
        dataType:"NUMBER", 
        semantics: {
          conceptType: 'METRIC'
        }
      },
      {
        'name': "search_engine_id", 
        label: "Search Engine ID", 
        dataType:"NUMBER", 
        semantics: {
          conceptType: 'DIMENSION'
        }
      },
      {
        'name': "page_score", 
        label: "Page Score", 
        dataType:"NUMBER", 
        semantics: {
          conceptType: 'METRIC'
        }
      },
      {
        'name': "search_volume", 
        label: "Search Volume", 
        dataType:"NUMBER", 
        semantics: {
          conceptType: 'METRIC'
        }
      },
      {
        'name': "page_number", 
        label: "Page Number", 
        dataType:"NUMBER", 
        semantics: {
          conceptType: 'METRIC'
        }
      },
      {
        'name': "previous_rank", 
        label: "Previous Rank", 
        dataType:"NUMBER", 
        semantics: {
          conceptType: 'METRIC'
        }
      },
      {
        'name': "added_on", 
        label: "Added On", 
        dataType: "STRING", 
        semantics: {
            conceptType: 'DIMENSION',
            semanticGroup: 'DATE_OR_TIME',
            semanticType: 'YEAR_MONTH_DAY'
        }
      }
    ]
  };
  return s;
}


function getData(request) {
  var cc = DataStudioApp.createCommunityConnector();
  var config = cc.getConfig();
  
  var dataSchema = [];
  var fixedSchema = getSchema().schema;
  request.fields.forEach(function(field) {
    for (var i = 0; i < fixedSchema.length; i++) {
      if (fixedSchema[i].name == field.name) {
        dataSchema.push(fixedSchema[i]);
        break;
      }
    }
  });

  var data = [];
  

  for(var j =0; j<10; j++) {

    var offset = parseInt(500 * j);

    var userProperties = PropertiesService.getUserProperties();
    username = userProperties.getProperty('dscc.username');
    password = userProperties.getProperty('dscc.password');
    
    var rawResponse = UrlFetchApp.fetch('https://apiv2dev.rankwatch.com/project/detail/json/p_id/' + request.configParams.projectId + '/s_id/' + request.configParams.sId + '/count/500/offset/' + offset + '/', {
                                        method: 'GET',
                                        headers: {
                                          'Authorization': 'Basic ' + Utilities.base64Encode(username + ':' + password)
                                        }
     });

var content = JSON.parse(rawResponse.getContentText());
for (var k in content['data']) {
  if(k == "average_rank" || k == "total_keywords") {
    continue;
  } else {
    var values = [];
    dataSchema.forEach(function(field) {
      switch (field.name) {
        case 'ranked_url':
          values.push(content['data'][k]['ranked_url']);
          break;
        case 'url':
          values.push(content['data'][k]['url']+ " ");
          break;
        case 'p_id':
          values.push(content['data'][k]['p_id']+ " ");
          break;
        case 'keyword':
          //Logger.log(content['data'][k]['keyword']);
          values.push(content['data'][k]['keyword']);
          break;
        case 'initial_rank':
          values.push(parseInt(content['data'][k]['initial_rank']));
          break;
        case 'current_rank':
          values.push(parseInt(content['data'][k]['current_rank']));
          break;
        case 'highest_rank':
          values.push(parseInt(content['data'][k]['highest_rank']));
          break;
        case 'search_engine_id':
          values.push(parseInt(content['data'][k]['search_engine_id']));
          break;
        case 'page_score':
          if (parseInt(content['data'][k]['page_score']) > 0) {
            values.push(parseInt(content['data'][k]['page_score']));
          } else {
            values.push(0);
          }
          break;
        case 'search_volume':
          values.push(parseInt(content['data'][k]['search_volume']));
          break;
        case 'page_number':
          values.push(parseInt(content['data'][k]['page_number']));
          break;
        case 'previous_rank':
          values.push(parseInt(content['data'][k]['previous_rank']));
          break;
        case 'added_on':
          values.push(content['data'][k]['added_on']);
          break;
        default:
          values.push(900);
      }
      
    });
    data.push({
      values: values
    });
  }
}
if(data.length<offset)
  break;
}
  
return {
    schema: dataSchema,
    rows: data
  };
}