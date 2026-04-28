from vosk import Model, KaldiRecognizer
import wave
import json

wf = wave.open("temp/audio.wav", "rb")
model = Model("model")

rec = KaldiRecognizer(model, wf.getframerate())

text = ""

while True:
    data = wf.readframes(4000)
    if len(data) == 0:
        break
    if rec.AcceptWaveform(data):
        result = json.loads(rec.Result())
        text += result.get("text", "") + " "

print(text)