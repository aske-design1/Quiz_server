// What this file needs --> Client side:

let array = SetNameAndCount(); 
let nick = array[0]; 
let count = array[1]; 

document.getElementById('user').textContent = nick;
document.getElementById('count').textContent = `Points: ${count}`;
button = document.getElementById('button');
// Essential div's for server communication
const question = document.getElementById('question');
const answer = document.getElementById('answer');
const timer = document.getElementById('secLeft');

//JSON file consisted of question and answers
const jsonData = fetch('./questionSheet')
    .then(res => {
        if (!res.ok) {
            throw new Error('Unable to fetch the data');
        }
        console.log('Fetch was succesful!');

        return res.json();
    }).catch(() => {
        throw new Error(`HTTP error! Status: ${response.status}`);
    });


const quiz = new EventSource('/quiz');
let Answering = false; 

//Add an eventlistener when a question and possible answers arrive
quiz.addEventListener('qna', event => {
    
    if(Answering) return;

    console.log('Received');

    jsonData.then(json => {

        // Get the data string that was received
        const questionKey = event.data;
        console.log(questionKey);
        
        // Add the question to html
        AddQuestion(questionKey, json);
        
        // Add answer multiple choice 
        let submitButton = AddAnswer(questionKey, json);
        
        // When the answer is submitted
        submitButton.addEventListener('click', AnswerSubmission);

        // Start the count down
        countDown(30);
    
        Answering = true; 
        
    }).catch(err => {
        throw new Error(err); 
    });

});

let changeUsername = document.getElementById('UsernameChange');
changeUsername.addEventListener('click', (event) => {
    event.preventDefault(); 
    let nickname = document.getElementById('fieldtextUser').value; 
    setCookie('username', nickname, 1);
    document.getElementById('user').textContent = nickname;
  });

function AddQuestion(questionKey, json) {
    let questionStr = json.questions[questionKey];

    let QuestionPara = document.createElement('p');
    QuestionPara.textContent = questionStr;
    QuestionPara.id = 'que';
    question.append(QuestionPara);
}

function AddAnswer(questionKey, json) {
    let multipleChoice = json.answers[questionKey];
    let radioAns = document.createElement('form');
    radioAns.id = 'form'; 

    for(let i = 0; i < multipleChoice.length; i++) {
        let radio = document.createElement('input'); 
        radio.type = 'radio';
        radio.id = `option ${i + 1}`; 
        radio.value = `${multipleChoice[i]}\n${questionKey}`;
        radio.name = 'choice'; 

        let label = document.createElement('label'); 
        label.textContent = multipleChoice[i]; 
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
    let selectedRadioButton = document.querySelector('input[name="choice"]:checked');

    button.disabled = true;
    if(!selectedRadioButton){
        console.log('Please select an option before submitting.');
        button.disabled = false; 
        return;
    }

    let data = selectedRadioButton.value;
    fetch('./submission', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: data
    }).then(res => (res.text())
    ).then(data => {
        RemoveHTMLElements();
        data === 'true' ? AnswerHandler(true) : AnswerHandler(false); 
        // The user is no more answering questions 
        Answering = false; 
        clearInterval(countdown);
        displaySec(0);
    }).catch(err => {
        console.error(err); 
    });
}

let countdown; 
function countDown(sec) {
        countdown = setInterval(() => {
            displaySec(sec);
            if (sec <= 0) {
                clearInterval(countdown);
                RemoveHTMLElements();
                window.alert('You failed to answer the question in time :/');
                Answering = false; 
            }
            sec--;
    }, 1000);
}

function displaySec(sec) {
    let displaySec = sec < 10 ? '0' + String(sec) : String(sec);
    timer.textContent = `Timer: ${displaySec}`;
}

function AnswerHandler(correctAnswer) {
    
    let message = 'You got the wrong answer sadly :(\nYou gain no points';

    if(correctAnswer) { // If answer was correct
        let countHTML = document.getElementById('count');
        countHTML.textContent = `Points: ${++count}`;
        setCookie('correct', count, 1);
        message = 'You got the correct answer. Congratulations.\nTherefore one point has been added';
    }

    window.alert(message);
    let message2 = correctAnswer ? 'Congratulations!' : 'Kæmpe L'; 
    setTimeout(() => (window.alert(message2)), 2000);
}

function RemoveHTMLElements(){
    let questionToRemove = document.getElementById('que');
    question.removeChild(questionToRemove);

    let answerFormToRemove = document.getElementById('form'); 
    answer.removeChild(answerFormToRemove);
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
    let cookies = getCookies();
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
