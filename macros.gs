/** @OnlyCurrentDoc */

var API_KEY = "<TODO API KEY>";
var PHAB_DOMAIN = "phabricator.wikimedia.org";
var USER_AGENT = 'Google Sheets ( https://github.com/addshore/phabricator-google-apps-script )';

// Methods for use in cells!
function phabTitle(taskId){return getTaskData(taskId).title}
function phabStatus(taskId){return getTaskData(taskId).status}
function phabAuthor(taskId){return getTaskData(taskId).author}
function phabDateCreated(taskId){return getTaskData(taskId).created}
function phabPoints(taskId){return getTaskData(taskId).points}
function phabBoardColumn(taskId,boardShortcut){return getTaskData(taskId).boards[boardShortcut]}

function epochToDateString( timestamp ) {
  var date = new Date(parseInt(timestamp) * 1000);
  var year = date.getFullYear();
  var month = date.getMonth() + 1;
  var day = date.getDate();
  return year + "-" + month + "-" + day;
}

/**
 * @var string taskId Example: "T1234"
 */
function phabTaskData( taskId ){
  if(!taskId){
    console.log("phabTaskData: No task ID requested.");
    return null;
  }

  console.log('phabTaskData: ' + taskId);
  // https://developers.google.com/apps-script/reference/cache
  var cache = CacheService.getDocumentCache();
  var cached = cache.get( taskId )
  if(!cached) {
    // https://phabricator.wikimedia.org/conduit/method/maniphest.search/
    var response = UrlFetchApp.fetch(
      'https://' + PHAB_DOMAIN + '/api/maniphest.search',
      {
        'method' : 'post',
        'payload' : {
          'api.token': API_KEY,
          'constraints[ids][0]': taskId.substring(1),
          'attachments[columns][boards][columns]': true, 
        },
        'headers' : {
          'User-Agent': USER_AGENT
        }
      }
    );
    cached = response.getContentText();
    // Put for 30 mins to 1h 30 mins in the cache
    cache.put( taskId, cached, 60 * ( 30 + Math.floor(Math.random() * 60) ) );         
  }
  return JSON.parse( cached );
}

function getTaskData( taskId ){
  if(!taskId){
    console.log("getTaskData: No task ID requested.");
    return null;
  }

  var rawData = phabTaskData( taskId )

  // TODO make this more easily customizable... or automagic
  boards = {};
  try { boards["wdwb-tech"] = rawData.result.data[0].attachments.columns.boards["PHID-PROJ-nbjc4z7zzodvkzp326ot"].columns[0].name }
  catch(err) { boards["wdwb-tech"] = null }
  try { boards["campsite"] = rawData.result.data[0].attachments.columns.boards["PHID-PROJ-egbmgxclscgwu2rbnotm"].columns[0].name }
  catch(err) { boards["campsite"] = null }

  return {
    'id': rawData.result.data[0].id,
    'title': rawData.result.data[0].fields.name,
    'status': rawData.result.data[0].fields.status.name,
    'author': getUserData(rawData.result.data[0].fields.authorPHID).name,
    'created': epochToDateString(rawData.result.data[0].fields.dateCreated),
    'points': rawData.result.data[0].fields.points,
    'boards': boards
  }
}

/**
 * @var string userId Example: "PHID-USER-u7w6n5ecde66oujx33pe"
 */
function phabUserData( userId ){
  console.log('phabUserData: ' + userId);
  // https://developers.google.com/apps-script/reference/cache
  var cache = CacheService.getDocumentCache();
  var cached = cache.get( userId )
  if(!cached) {
    // https://phabricator.wikimedia.org/conduit/method/user.search/
    var response = UrlFetchApp.fetch(
      'https://' + PHAB_DOMAIN + '/api/user.search',
      {
        'method' : 'post',
        'payload' : {
          'api.token': API_KEY,
          'constraints[phids][0]': userId
        },
        'headers' : {
          'User-Agent': USER_AGENT
        }
      }
      );
    cached = response.getContentText();
    // Put for 15 hours in cache...
    cache.put( userId, cached, 60 * 60 * 15 );
  }
  return JSON.parse( cached );
}

function getUserData( userId ){
  var rawData = phabUserData( userId )
  return {
    'id': rawData.result.data[0].id,
    'name': rawData.result.data[0].fields.username,
  }
}
