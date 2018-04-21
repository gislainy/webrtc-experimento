/**
 * Declaração das variáveis que serão utilizadas
 */

const videoLocal = document.querySelector("#localVideo");
const remoteVideo = document.querySelector("#remoteVideo");
const dataChannelSend = document.querySelector("#dataChannelSend");
const dataChannelReceive = document.querySelector("#dataChannelReceive");
var sendButton = document.querySelector("#sendButton");
const constraints = {
  video: true,
  audio: true,
}
const room = "consulta";
const socket = io.connect();
let pc = {};
let localStream, remoteStream, sendChannel, receiveChannel;
var pc_config = webrtcDetectedBrowser === 'firefox' ? {
  'iceServers':
    [
      { 'urls': 'stun:stun.services.mozilla.com' }
    ]
} : // IP address    stun:stun.services.mozilla.com
  {
    'iceServers':
      [
        { 'urls': 'stun:stun.l.google.com:19302' }
      ]
  };
let isChannelReady = false;
let isInitiator = false;
let isStarted = false;
/**
 * Declaração da função de onclick do sendButton
 */
sendButton.onclick = sendData;
function sendData() {
  data = dataChannelSend.value;
  dataChannelSend.value = '';
  if (isInitiator) sendChannel.send(data);
  else 
    receiveChannel.send(data);
  
}

/**
 * criar a sala ou entrar na sala
 */
socket.emit('create or join', room);

/**
 * Captura da media do usuário
 */

navigator.mediaDevices.getUserMedia(constraints)
  .then(function (stream) {
    videoLocal.srcObject = stream;
    videoLocal.play();
    videoLocal.muted = true;
    localStream = stream;
    enviarMensagem("got user media");
    if (isInitiator) {
      checarParaIniciar();
    }
    /* use the stream */
  })
  .catch(function (err) {
    erro('navigator.mediaDevices.getUserMedia', err);
  });
/**
 * Conectar por socket com o servidor enviando e recebendo mensagem
 */

socket.on("message", (message) => {
  if (message === "got user media") {
    checarParaIniciar();
  }
  else if (message.type === "offer") {
    if (!isInitiator && !isStarted)
      checarParaIniciar();
    pc.setRemoteDescription(new RTCSessionDescription(message));
    console.log('Envio de resposta ao peer.');
    pc.createAnswer(setLocalDescription, setLocalDescriptionErro);

  } else if (message.type == "answer" && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    pc.addIceCandidate(new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    }));
  }
})

setLocalDescription = (sessionDescription) => {
  console.log('setLocalDescription')
  pc.setLocalDescription(sessionDescription)
    .then(enviarMensagem(sessionDescription))
    .catch(setLocalDescriptionErro)
}
setLocalDescriptionErro = (error) => {
  erro('setLocalDescriptionErro', error)
}
socket.on("created", (room) => {
  console.log('room criada' + room);
  isInitiator = true;
});
socket.on("join", (room) => {
  console.log('join' + room);
  isChannelReady = true;
});
socket.on("joined", (room) => {
  console.log('joined' + room);
  isChannelReady = true;
});
socket.on("full", (room) => {
  console.log('full' + room);
});
/**
 * função para enviar mensagem para o servidor
 */

enviarMensagem = (mensagem) => {
  // console.log('estou enviando uma mensagem', mensagem);
  socket.emit('message', mensagem);
}

/**
 * checar se poder iniciar a conexão
 */

checarParaIniciar = () => {
  try {
    if (!isStarted && typeof localStream != "undefined" && isChannelReady) {
      criarPeerConection();
      pc.addTrack(localStream.getVideoTracks()[0], localStream);
      pc.addTrack(localStream.getAudioTracks()[0], localStream);
      isStarted = true;
      if (isInitiator) {
        pc.createOffer(setLocalDescription, setLocalDescriptionErro);
      }
    }
  } catch (err) {
    erro('checarParaIniciar', err);
  }
}

/**
 * criarPeerConection funcão para criar a conexão com o parceiro
 */

criarPeerConection = () => {
  try {
    pc = new RTCPeerConnection(pc_config);
    pc.onicecandidate = handleIceCandidate;
  } catch (err) {
    erro('criarPeerConection', err);
  }
  pc.ontrack = function (event) {
    console.log('remoteVideo')
    remoteVideo.srcObject = event.streams[0];
  }
  if (isInitiator) {
    try {
      sendChannel = pc.createDataChannel("sendDataChannel",
        { reliable: true });
      console.log('crieou o sendChannel', sendChannel)
    } catch (err) {
      erro('criarPeerConection', err);
    }
    sendChannel.onmessage = handleReceiveMessage;
  } else {
    console.log(' pc.ondatachannel = receiveChannelCallback;')
    pc.ondatachannel = receiveChannelCallback;
  }
}

/**
 * handleReceiveMessage
 */

handleReceiveMessage = (event) => {
  debugger
  dataChannelReceive.value += event.data + '\n';
}
/**
 * receiveChannelCallback
 */

receiveChannelCallback = (event) => {
  receiveChannel = event.channel;
  receiveChannel.onmessage = handleReceiveMessage;
  console.log('criou o receiveChannel', receiveChannel)
}
console.log('teste')
/**
 * handleIceCandidate
 */

handleIceCandidate = (event) => {
  console.log('handleIceCandidate');
  if (event.candidate) {
    enviarMensagem({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log("Terminou onicecandidate");
  }
}

/** 
 * sendMessage
*/
const erro = (local, err) => {
  console.log([local, err.message].join(''));
}