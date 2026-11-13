import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const source = await readFile(
  new URL("../android/app/src/main/assets/pop/voice.js", import.meta.url),
  "utf8",
);
const settle = () => new Promise((resolve) => setImmediate(resolve));
function fixture(
  handler = async (body) =>
    body.action === "connect"
      ? { transport: { sdp: "answer" } }
      : { status: "ready", draft: body.draft, created: false },
) {
  const events = [],
    requests = [],
    sent = [],
    tracks = [
      {
        enabled: true,
        stopped: false,
        stop() {
          this.stopped = true;
        },
      },
    ];
  let peer;
  const context = {
    setTimeout,
    clearTimeout,
    console,
    Promise,
    Map,
    Set,
    Error,
    JSON,
    navigator: {
      mediaDevices: {
        getUserMedia: async () => ({ getTracks: () => tracks, getAudioTracks: () => tracks }),
      },
    },
    Audio: class {
      play() {
        return Promise.resolve();
      }
      pause() {}
    },
    RTCPeerConnection: class {
      constructor() {
        peer = this;
        this.iceGatheringState = "complete";
      }
      addTrack() {}
      createOffer() {
        return Promise.resolve({ type: "offer", sdp: "v=0 test" });
      }
      setLocalDescription(value) {
        this.localDescription = value;
        return Promise.resolve();
      }
      setRemoteDescription(value) {
        this.answer = value;
        return Promise.resolve();
      }
      close() {}
      createDataChannel() {
        this.dc = { readyState: "open", send: (raw) => sent.push(JSON.parse(raw)), close() {} };
        return this.dc;
      }
    },
    PopNative: {
      event: (raw) => events.push(JSON.parse(raw)),
      request(id, raw) {
        const body = JSON.parse(raw);
        requests.push(body);
        Promise.resolve()
          .then(() => handler(body))
          .then(
            (value) => context.PopNativeResult(id, JSON.stringify(value)),
            (error) => context.PopNativeResult(id, JSON.stringify({ error: error.message })),
          );
      },
    },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return {
    events,
    requests,
    sent,
    tracks,
    start: () => context.PopVoice.start(),
    stop: () => context.PopVoice.stop(),
    created: (title) => context.PopVoice.created(title),
    updated: (draft) => context.PopVoice.updated(draft),
    mute: (value) => context.PopVoice.mute(value),
    emit: (event) => peer.dc.onmessage({ data: JSON.stringify(event) }),
    get peer() {
      return peer;
    },
    close() {
      if (peer?.dc) peer.dc.onmessage({ data: JSON.stringify({ type: "session.closed" }) });
    },
  };
}
const tool = (id = "call", extra = {}) => ({
  type: "response.event",
  event: {
    type: "response.output_item.done",
    item: {
      type: "function_call",
      name: "preparar_rascunho",
      call_id: id,
      arguments: JSON.stringify({
        draft: { title: "Teste sintético" },
        missingFields: [],
        ...extra,
      }),
    },
  },
});
test("WebRTC negotiation uses the native authenticated bridge", async () => {
  const f = fixture();
  try {
    await f.start();
    assert.equal(f.requests[0].action, "connect");
    assert.equal(f.requests[0].sdp, "v=0 test");
    assert.equal(f.peer.answer.sdp, "answer");
    f.emit({ type: "session.started" });
    assert.ok(f.events.some((e) => e.type === "connected"));
  } finally {
    f.close();
  }
});
test("Live nested function calls are validated once and resumed with the correct protocol", async () => {
  const f = fixture();
  try {
    await f.start();
    f.emit(tool());
    f.emit(tool());
    await settle();
    await settle();
    assert.equal(f.requests.filter((r) => r.action === "prepare").length, 1);
    assert.deepEqual(
      f.sent.map((x) => x.type),
      ["response.item.create", "response.create"],
    );
    assert.equal(f.sent[0].item.call_id, "call");
    assert.equal(JSON.parse(f.sent[0].item.output).created, false);
  } finally {
    f.close();
  }
});
test("model arguments cannot select the task creation endpoint", async () => {
  const f = fixture();
  try {
    await f.start();
    f.emit(tool("injected", { action: "create" }));
    await settle();
    await settle();
    assert.equal(f.requests[1].action, "prepare");
  } finally {
    f.close();
  }
});
test("closing stops the microphone immediately and ignores delayed draft results", async () => {
  let finish;
  const f = fixture((body) =>
    body.action === "connect"
      ? Promise.resolve({ transport: { sdp: "answer" } })
      : new Promise((resolve) => {
          finish = resolve;
        }),
  );
  try {
    await f.start();
    f.emit(tool());
    await settle();
    f.stop();
    assert.equal(f.tracks[0].stopped, true);
    finish({ status: "ready", draft: { title: "Late" } });
    await settle();
    await settle();
    assert.equal(
      f.events.some((e) => e.type === "draft"),
      false,
    );
    assert.deepEqual(
      f.sent.map((x) => x.type),
      ["session.close"],
    );
  } finally {
    f.close();
  }
});
test("transport errors stop capture and let the user try again", async () => {
  const f = fixture(async () => {
    throw new Error("No connection");
  });
  await f.start();
  assert.equal(f.tracks[0].stopped, true);
  assert.ok(f.events.some((e) => e.type === "error"));
  assert.ok(f.events.some((e) => e.type === "ended"));
});
test("muting disables capture and sends the Live mute event", async () => {
  const f = fixture();
  try {
    await f.start();
    f.mute(true);
    assert.equal(f.tracks[0].enabled, false);
    assert.equal(f.sent[0].type, "session.input_audio.mute");
    f.mute(false);
    assert.equal(f.tracks[0].enabled, true);
    assert.equal(f.sent[1].type, "session.input_audio.unmute");
  } finally {
    f.close();
  }
});
test("a confirmed creation uses the Live content field and does not create again", async () => {
  const f = fixture();
  try {
    await f.start();
    f.created('Atividade "revisada"');
    const event = f.sent[0];
    assert.equal(event.type, "session.instructions.append");
    assert.equal(event.delegation_id, null);
    assert.equal(typeof event.content, "string");
    assert.equal(event.text, undefined);
    assert.match(event.content, /criada com sucesso/);
    assert.equal(f.requests.length, 1);
  } finally {
    f.close();
  }
});
test("manual schedule changes update the conversation with validated data", async () => {
  const f = fixture();
  try {
    await f.start();
    f.updated({ dueTime: "09:00", durationMinutes: 30 });
    assert.equal(f.sent[0].type, "session.instructions.append");
    assert.match(f.sent[0].content, /09:00/);
    assert.match(f.sent[0].content, /durationMinutes/);
  } finally {
    f.close();
  }
});
