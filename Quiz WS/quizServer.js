// Server side 
import http from 'http';
import fs from 'fs';
import url from 'url';
import path from "path";
import WebSocket from 'websocket';

const clientHTML = fs.readFileSync('PublicResources/html/quiz.html');
const QuestJson = fs.readFileSync('question.json');

const server = new http.Server();
const hostname = '192.168.1.205';
const port = 3000;
let webSocketServer = WebSocket.server;
server.listen(port, hostname, () => (console.log(`Server running at http://${hostname}:${port}/`)));

let wsServer = new webSocketServer({
    httpServer: server
});

server.on('request', (request, response) => {
    let pathname = url.parse(request.url).pathname;
    let pathElements = pathname.split('/');
    switch (request.method) {
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
                case 'address':

                    response.writeHead(200, {
                        'Content-Type': 'text/plain'
                    }).end(`${hostname}:${port}`);
                    break;
                default:
                    fileResponse(request.url, response);
                    break;
            }
            break;
        default:
            response.writeHead(404).end();
            break;
    }
});

wsServer.on('request', request => {
    console.log('Message from ' + request.origin + '.');
    let connection = request.accept(null, request.origin);
    console.log('Connection was accepted');

    connection.on('message', message => {
        console.log('Type of msg: ' + typeof message.utf8Data);

        const msgJson = JSON.parse(message.utf8Data);
        switch (msgJson.action) {
            case 'NewQuestion':
                QuestionAndAnswer(connection);
                break;
            case 'CheckAns':
                AnswerHandler(connection, msgJson.answer, msgJson.key);
                break;
            case 'CountDown':
                Countdown(connection, 30);
                break;
            case 'clearCountDown':
                clearInterval(countdown);
                connection.send(JSON.stringify({
                    'action': 'countdown',
                    'sec': '0',
                    'zeroTime': false
                }));
                break;
        }
    });
});

function GetFiles(res, type, file) {
    res.writeHead(200, {
        'Content-Type': type
    }).end(file);
}

function fileResponse(filename, res) {
    const sPath = securePath(filename);
    console.log("Reading:" + sPath);
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

const publicResources = "PublicResources/";
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

function QuestionAndAnswer(socket) {
    const json = JSON.parse(QuestJson)
    const numberOfQuestions = Object.keys(json.questions).length;

    const rand = Math.floor(Math.random() * numberOfQuestions + 1);
    const qna = {
        'action': 'QuestionSender',
        'question': json.questions[String(rand)],
        'answers': json.answers[String(rand)],
        'key': String(rand)
    }

    socket.send(JSON.stringify(qna));
}

function AnswerHandler(socket, answer, key) {
    const questionObject = JSON.parse(QuestJson);
    let correctAnswer = questionObject.correct_answers[key];

    const msg = {
        'action': 'QuestionFeedback',
        'isCorrect': correctAnswer === answer
    }
    socket.send(JSON.stringify(msg));
}

let countdown;
function Countdown(socket, sec) {
    countdown = setInterval(() => {
        let countdownOBJ = {
            'action': 'countdown',
            'sec': 0,
            'zeroTime': false
        }
        countdownOBJ.sec = sec;

        if (sec <= 0) {
            countdownOBJ.zeroTime = true;
            clearInterval(countdown);
        }
        socket.send(JSON.stringify(countdownOBJ));
        sec--;
    }, 1000);
}