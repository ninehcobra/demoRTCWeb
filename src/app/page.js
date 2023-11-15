'use client'
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue } from 'firebase/database';

export default function Home() {
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);

  var yourVideo;
  var friendsVideo;

  var yourId = Math.floor(Math.random() * 1000000000);
  var servers = { 'iceServers': [{ 'urls': 'stun:stun.services.mozilla.com' }, { 'urls': 'stun:stun.l.google.com:19302' }, { 'urls': 'turn:numb.viagenie.ca', 'credential': 'webrtc', 'username': 'websitebeaver@mail.com' }] };
  var pc = new RTCPeerConnection(servers);

  pc.onicecandidate = (event => event.candidate ? sendMessage(yourId, JSON.stringify({ 'ice': event.candidate })) : console.log("Sent All Ice"));
  pc.onaddstream = (event => friendsVideo.srcObject = event.stream);

  function sendMessage(senderId, data) {
    var msg = push(ref(database), { sender: senderId, message: data });
    msg.remove();
  }

  function readMessage(data) {
    var msg = JSON.parse(data.val().message);
    var sender = data.val().sender;
    if (sender != yourId) {
      if (msg.ice != undefined) {
        pc.addIceCandidate(new RTCIceCandidate(msg.ice));
      } else if (msg.sdp.type == "offer") {
        var r = confirm("Answer call?");
        if (r == true) {
          pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
            .then(() => pc.createAnswer())
            .then(answer => pc.setLocalDescription(answer))
            .then(() => sendMessage(yourId, JSON.stringify({ 'sdp': pc.localDescription })));
        } else {
          alert("Rejected the call");
        }
      } else if (msg.sdp.type == "answer") {
        pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      }
    }
  }

  onValue(ref(database), (snapshot) => {
    snapshot.forEach((childSnapshot) => {
      readMessage(childSnapshot);
    });
  });

  function showMyFace() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(stream => {
        yourVideo.srcObject = stream;
        pc.addStream(stream);
      });
  }

  function showFriendsFace() {
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => sendMessage(yourId, JSON.stringify({ 'sdp': pc.localDescription })));
  }

  return (
    <div>
      <video id="yourVideo" autoPlay muted></video>
      <video id="friendsVideo" autoPlay></video>
      <br />
      <button onClick={() => showFriendsFace()} type="button" className="btn btn-primary btn-lg">
        <span className="glyphicon glyphicon-facetime-video" aria-hidden="true"></span> Call
      </button>
    </div>
  );
}
