// Server side 
import http from 'http';
import fs from 'fs';
import url from 'url';
import path from "path";
// The HTML file for the chat client. Used below.
const clientHTML = fs.readFileSync('PublicResources/html/quiz.html');
const QuestJson = fs.readFileSync('question.json');


let server = new http.Server();
server.listen(8080, 'localhost', () => {
    console.log('To connect to the Quiz, go to http://localhost:8080/');
});


server.on('request', (request, response) => {
    let pathname = url.parse(request.url).pathname;
    let pathElements = pathname.split('/');
    switch (request.method) {
        case 'POST':
            switch (pathElements[1]) {
                case 'submission':
                    console.log('Succesfully submitted');
                    AnswerHandler(request, response);
                    break;
            }
            break;
        case 'GET':
            switch (pathElements[1]) {
                case '':
                    GetFiles(response, 'text/html', clientHTML);
                    break;
                case 'favicon.ico':
                    GetFiles(response, 'image/ico', fs.readFileSync('favicon.ico'));
                    break;
                case 'questionSheet': 
                    GetFiles(response, 'application/json', QuestJson);
                    break; 
                case 'quiz':
                    console.log('SSE Request received');
                    acceptNewClient(request, response);

                    setInterval(() => (QuestionAndAnswer(response)), 10000);
                    break;
                default:
                    fileResponse(request.url, response);
                    break;
            }
            break;
        default:
            // Otherwise send a 404 error for any path other than "/chat" or for
            // any method other than "GET" and "POST"
            response.writeHead(404).end();
            break;
    }
});

function GetFiles(res, type, file) {
    res.writeHead(200, {
        'Content-Type': type
    }).end(file);
}

function fileResponse(filename, res) {
    const sPath = securePath(filename);
    fs.readFile(sPath, (err, data) => {
        if (err) {
            console.error(err);
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/txt');
            res.write("File Error:" + String(err));
            res.end("\n");
        } else {
            res.statusCode = 200;
            res.setHeader('Content-Type', guessMimeType(filename));
            res.write(data);
            res.end('\n');
        }
    })
}

const publicResources = 'PublicResources/';
const rootFileSystem = process.cwd();
function securePath(userPath) {
    if (userPath.indexOf('\0') !== -1) {
        return undefined;
    }
    userPath = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, '');
    userPath = publicResources + userPath;

    let p = path.join(rootFileSystem, path.normalize(userPath));
    return p;
}

function guessMimeType(fileName) {
    const fileExtension = fileName.split('.').pop().toLowerCase();
    console.log(fileExtension);
    const ext2Mime = { 
        "txt": "text/txt",
        "html": "text/html",
        "ico": "image/ico",
        "js": "text/javascript",
        "json": "application/json",
        "css": 'text/css',
        "png": 'image/png',
        "jpg": 'image/jpeg',
        "wav": 'audio/wav',
        "mp3": 'audio/mpeg',
        "svg": 'image/svg+xml',
        "pdf": 'application/pdf',
        "doc": 'application/msword',
        "docx": 'application/msword'
    };
    return (ext2Mime[fileExtension] || "text/plain");
}

function acceptNewClient(request, response) {
    request.connection.on('end', () => {
        response.end();
    });
    response.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    });
}

function QuestionAndAnswer(response) {
    let json = JSON.parse(QuestJson)
    const numberOfQuestions = Object.keys(json.questions).length;
    console.log(numberOfQuestions);
    let rand = Math.floor(Math.random() * numberOfQuestions + 1);
    let event = `event: qna\ndata: ${rand}\n\n`;
    response.write(event);
}

async function AnswerHandler(req, res) {
    const questObject = JSON.parse(QuestJson);

    req.setEncoding('utf8');
    let body = '';
    for await (let chunk of req) {
        body += chunk;
    }
    let data = body.split('\n');
    let correctAnswer = questObject.correct_answers[data[1]];

    res.writeHead(200, {
        'Content-Type': 'text/plain'
    });

    data[0] === correctAnswer ? res.write('true') : res.write('false');
    res.end();
}