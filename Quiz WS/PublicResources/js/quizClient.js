// What this file needs --> Client side:
const ip = '192.168.1.205';
const port = 3000;

// Essential div's for server communication
const question = document.getElementById('question');
const answer = document.getElementById('answer');
const timer = document.getElementById('secLeft');



// Loads the cookies and adds name, count and a button to ask for questions on the html side
const cookies = getCookies(); 
let count = addNameAndCount();
addQuestButton();

// The websocket
const quizSocket = new WebSocket(`ws://${ip}:${port}/quiz`);
quizSocket.onmessage = event => {
    const qna = JSON.parse(event.data);
    switch(qna.action) {
        case 'QuestionSender': 
            AddQuestion(qna.question);
            let submitButton = AddAnswer(qna.answers, qna.key);
            submitButton.addEventListener('click', AnswerSubmission);

            const CountDown = { 'action': 'CountDown' }; 
            quizSocket.send(JSON.stringify(CountDown));
            break; 
        case 'QuestionFeedback':
            AnswerHandler(qna.isCorrect);
            RemoveHTMLElements();
            clearInterval(countdown);
            break; 
        case 'countdown': 
            qna.zeroTime ? outOfTime() : displaySec(qna.sec);
            break; 
    }
}

function addQuestButton() {
    let button = document.createElement('button');
    button.textContent = 'Click to get new question'; 
    button.addEventListener('click', AskForMessageButton); 
    button.id = 'newQuest';
    question.append(button);
}

function AskForMessageButton() {
    question.removeChild(document.getElementById('newQuest'));
    const data = { 'action': 'NewQuestion' };
    quizSocket.send(JSON.stringify(data)); 
}

function AddQuestion(questionString) {
    let QuestionPara = document.createElement('p');
    QuestionPara.textContent = questionString;
    QuestionPara.id = 'que';
    question.append(QuestionPara);
}

function AddAnswer(answerArray, key) {
    let multipleChoice = answerArray;
    let radioAns = document.createElement('form');
    radioAns.id = 'form'; 

    for(let i = 0; i < multipleChoice.length; i++) {
        let radio = document.createElement('input'); 
        radio.type = 'radio';
        radio.id = `option ${i + 1}`; 
        radio.value = `${answerArray[i]}\n${key}`;
        radio.name = 'choice'; 

        let label = document.createElement('label'); 
        label.textContent = answerArray[i]; 
        label.htmlFor = radio.id;   

        radioAns.append(radio); 
        radioAns.append(label); 
        radioAns.append(document.createElement('br'));
    }

    let button = document.createElement('button');
    button.textContent = 'submit final answer';
    button.type = 'submit';
    button.id = 'SubmitAns'; 
    radioAns.append(button);
    answer.append(radioAns); 

    return button;
}

function AnswerSubmission() {
    let button = document.getElementById('SubmitAns'); 
    button.disabled = true;  

    let selectedRadioButton = document.querySelector('input[name="choice"]:checked');

    if(!selectedRadioButton){
        console.log('Please select an option before submitting.');
        button.disabled = false; 
        return;
    }

    let value = selectedRadioButton.value.split('\n');
    const data = {
        'action': 'CheckAns',
        'answer': value[0],
        'key': value[1]
    }
    quizSocket.send(JSON.stringify(data)); 
}

let countdown; 
function outOfTime() {
    displaySec(0);
    RemoveHTMLElements();
    window.alert('You failed to answer the question in time :/');
    addQuestButton();
}

function displaySec(sec) {
    const displaySec = Number(sec) < 10 ? '0' + sec : String(sec);
    timer.textContent = `Timer: ${displaySec}`;
}

function AnswerHandler(correctAnswer) {
    
    let message = 'You got the wrong answer sadly :(\nYou gain no points';

    if(correctAnswer) { // If answer was correct
        const countHTML = document.getElementById('count');
        countHTML.textContent = `Points: ${++count}`;
        setCookie('correct', count, 1);
        message = 'You got the correct answer. Congratulations.\nTherefore one point has been added';

    }
    window.alert(message);

    const clearTimerObj = { 'action': 'clearCountDown' };
    quizSocket.send(JSON.stringify(clearTimerObj)); 
    addQuestButton();
}

function RemoveHTMLElements(){
    const questionToRemove = document.getElementById('que');
    
    if(!question.contains(questionToRemove)) return; 
    question.removeChild(questionToRemove);

    const answerFormToRemove = document.getElementById('form'); 
    answer.removeChild(answerFormToRemove);
}


//* COOKIES
function addNameAndCount() {
    const nameAndCount = SetNameAndCount(); 
    document.getElementById('user').textContent = nameAndCount[0];
    document.getElementById('count').textContent = `Points: ${nameAndCount[1]}`;
    button = document.getElementById('button');
    return nameAndCount[1];
}

function setCookie(name, value, daysToLive) {
    let cookie = `${name}=${encodeURIComponent(value)}`;
    cookie += `;max-age=${daysToLive*60*60*24}`;
    document.cookie = cookie;
}
  
function getCookies() {
    let cookies = new Map(); // The object we will return
    let all = document.cookie; // Get all cookies in one big string
    let list = all.split("; "); // Split into individual name/value pairs
    for(let cookie of list) { // For each cookie in that list
        if (!cookie.includes("=")) continue; // Skip if there is no = sign
        let p = cookie.indexOf("="); // Find the first = sign
        let name = cookie.substring(0, p); // Get cookie name
        let value = cookie.substring(p+1); // Get cookie value
        value = decodeURIComponent(value); // Decode the value
        cookies.set(name, value); // Remember cookie name and value
    }
    return cookies;
}

function SetNameAndCount() {
    let arr = [2]; let nick; let count; 

    if (!cookies.get('username')) {
        nick = prompt('Enter your nickname');
        setCookie('username', nick, 1);
        count = 0; 
        setCookie('correct', count, 1);
    } else {
          nick = cookies.get('username');
          count = cookies.get('correct');
    }
    arr[0] = nick; 
    arr[1] = count; 
    return arr; 
}

//Change username functionality
const changeUsername = document.getElementById('newUserNameButton');
changeUsername.addEventListener('click', (event) => {
    event.preventDefault(); 
    let nickname = document.getElementById('fieldtextUser').value; 
    setCookie('username', nickname, 1);
    document.getElementById('user').textContent = nickname;
});