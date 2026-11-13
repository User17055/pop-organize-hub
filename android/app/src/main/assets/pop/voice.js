/* Local audio transport only. UI and credentials stay native. */
(() => {
  "use strict";
  const pending = new Map();
  const handled = new Set();
  let serial = 0, generation = 0, pc, dc, microphone, audio, closing = false, timer;
  let queue = Promise.resolve();
  const emit = (type, payload = {}) => PopNative.event(JSON.stringify({ type, ...payload }));
  const request = (body) => new Promise((resolve, reject) => {
    const id = String(++serial);
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error("A conexão demorou. Tente novamente.")); }, 35000);
    pending.set(id, { resolve, reject, timeout });
    PopNative.request(id, JSON.stringify(body));
  });
  window.PopNativeResult = (id, json) => {
    const item = pending.get(id); if (!item) return;
    clearTimeout(item.timeout); pending.delete(id);
    const value = JSON.parse(json);
    if (value.error) item.reject(new Error(value.error)); else item.resolve(value);
  };
  const send = event => { if (dc?.readyState === "open") dc.send(JSON.stringify(event)); };
  function cleanup() {
    ++generation; clearTimeout(timer);
    microphone?.getTracks().forEach(t => t.stop()); microphone = undefined;
    const old = dc; dc = undefined; old?.close();
    const peer = pc; pc = undefined; peer?.close();
    if (audio) { audio.pause(); audio.srcObject = null; audio = undefined; }
    for (const p of pending.values()) { clearTimeout(p.timeout); p.reject(new Error("Ligação encerrada.")); }
    pending.clear(); handled.clear(); closing = false;
    emit("ended");
  }
  async function handle(event, token) {
    if (token !== generation) return;
    if (event.type === "session.started") emit("connected");
    if (event.type === "session.closed") { cleanup(); return; }
    if (event.type === "session.input_transcript.delta" || event.type === "session.output_transcript.delta") {
      emit("transcript", { role: event.type.includes("input_") ? "user" : "assistant", text: event.delta, start: event.start_ms, end: event.end_ms });
    }
    if (event.type === "error") emit("error", { message: "O Pop encontrou uma falha na chamada. Tente novamente." });
    // Live forwards Responses events in an envelope. Calls exist on output_item.done,
    // not on response.completed (whose output is intentionally empty).
    const nested = event.type === "response.event" ? event.event : null;
    if (nested?.type !== "response.output_item.done" || nested.item?.type !== "function_call") return;
    const call = nested.item;
    if (handled.has(call.call_id)) return;
    handled.add(call.call_id);
    queue = queue.catch(() => {}).then(async () => {
      if (token !== generation || closing) return;
      emit("preparing");
      let result;
      try {
        if (call.name !== "preparar_rascunho") throw new Error("Ferramenta indisponível.");
        result = await request({ ...JSON.parse(call.arguments), action: "prepare" });
        if (token !== generation || closing) return;
        emit("draft", { answer: result });
      } catch (error) { result = { created: false, error: error.message }; emit("error", {message:error.message}); }
      emit("prepared");
      if (token !== generation || closing) return;
      send({ type: "response.item.create", item: { type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) } });
      send({ type: "response.create" });
    });
  }
  window.PopVoice = {
    async start(draft = null) {
      if (pc) return;
      const token = ++generation; closing = false; queue = Promise.resolve();
      emit("connecting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
        if (token !== generation) { stream.getTracks().forEach(t => t.stop()); return; }
        microphone = stream; pc = new RTCPeerConnection();
        const peer = pc;
        audio = new Audio(); audio.autoplay = true;
        peer.ontrack = event => { if (token !== generation) return; audio.srcObject = event.streams[0]; audio.play().catch(() => emit("error", {message:"Não foi possível reproduzir o áudio."})); };
        stream.getAudioTracks().forEach(t => peer.addTrack(t, stream));
        dc = peer.createDataChannel("oai-events");
        dc.onmessage = event => { try { void handle(JSON.parse(event.data), token); } catch {} };
        dc.onclose = () => { if (token === generation) cleanup(); };
        peer.onconnectionstatechange = () => { if (token === generation && ["failed", "closed"].includes(peer.connectionState)) cleanup(); };
        await peer.setLocalDescription(await peer.createOffer());
        if (peer.iceGatheringState !== "complete") await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => { peer.removeEventListener("icegatheringstatechange", check); reject(new Error("Falha ao preparar a conexão de áudio.")); }, 10000);
          function check() { if (peer.iceGatheringState === "complete") {clearTimeout(timeout); peer.removeEventListener("icegatheringstatechange", check); resolve();} }
          peer.addEventListener("icegatheringstatechange", check); check();
        });
        if (token !== generation) return;
        const result = await request({action:"connect",sdp:peer.localDescription.sdp,draft});
        if (token !== generation) return;
        await peer.setRemoteDescription({type:"answer",sdp:result.transport.sdp});
        timer = setTimeout(() => window.PopVoice.stop(), 15 * 60 * 1000);
      } catch (error) { if (token === generation) { emit("error",{message:error.message}); cleanup(); } }
    },
    mute(value) {
      microphone?.getAudioTracks().forEach(t => {t.enabled = !value;});
      send({type:value?"session.input_audio.mute":"session.input_audio.unmute"});
    },
    created(title) {
      send({type:"session.instructions.append",delegation_id:null,content:`Evento confirmado pelo aplicativo: a tarefa ${JSON.stringify(title)} foi criada com sucesso. O rascunho anterior está encerrado. Confirme brevemente. Não repita o cadastro.`});
    },
    updated(draft) {
      send({type:"session.instructions.append",delegation_id:null,content:`O usuário revisou o rascunho na tela. Estes são os dados atuais validados; preserve-os nas próximas alterações: ${JSON.stringify(draft)}`});
    },
    stop() {
      if (closing) return;
      closing = true; microphone?.getTracks().forEach(t => t.stop());
      if (dc?.readyState !== "open") { cleanup(); return; }
      send({type:"session.close"});
      clearTimeout(timer); timer = setTimeout(cleanup, 8000);
      emit("closing");
    }
  };
  emit("ready");
})();
