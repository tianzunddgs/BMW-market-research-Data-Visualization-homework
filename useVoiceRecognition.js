import { ref, watch } from 'vue';

export function useVoiceRecognition() {
  const isListening = ref(false);
  const transcript = ref('');
  const error = ref('');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    error.value = 'Your browser does not support the Web Speech API.';
    return { isListening, transcript, error };
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'zh-CN';

  recognition.onstart = () => {
    isListening.value = true;
    error.value = '';
  };

  recognition.onresult = (event) => {
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      }
    }
    if (finalTranscript) {
      transcript.value = finalTranscript.trim();
    }
  };

  recognition.onerror = (event) => {
  
    error.value = `Speech recognition error: ${event.error}`;
    isListening.value = false;
  };

  recognition.onend = () => {
    isListening.value = false;
  };

  
  async function ensureMicrophone() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia not supported');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
  }

  const toggleListening = async () => {
    if (isListening.value) {
      recognition.stop();
      return;
    }
    transcript.value = '';
    error.value = '';

    try {
     
      await ensureMicrophone();
      recognition.start();
     
    } catch (err) {
     
      if (err && err.name === 'NotAllowedError') {
        error.value = 'Microphone permission denied. Please allow microphone access in browser settings.';
      } else if (err && err.name === 'NotFoundError') {
        error.value = 'No microphone found. Please check your device.';
      } else {
        error.value = `Failed to access microphone: ${err.message || err}`;
      }
      isListening.value = false;
    }
  };


  watch(isListening, (listening) => {
    if (!listening && recognition) {
      try {
        recognition.stop();
      } catch (e) {
       
      }
    }
  });

  return {
    isListening,
    transcript,
    error,
    toggleListening,
  };
}

