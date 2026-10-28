import { EventEmitter } from 'node:events';

/** A terminal on both ends, driven by `type`, recording every frame drawn. */
export function fakeTty() {
  const input = new EventEmitter() as unknown as NodeJS.ReadStream;
  const written: string[] = [];
  Object.assign(input, {
    isTTY: true,
    isRaw: false,
    setRawMode(raw: boolean) {
      (this as { isRaw: boolean }).isRaw = raw;
      return this;
    },
    setEncoding() {
      return input;
    },
    resume() {
      return input;
    },
    pause() {
      return input;
    },
  });
  const output = {
    isTTY: true,
    rows: 30,
    write(chunk: string) {
      written.push(chunk);
      return true;
    },
  } as unknown as NodeJS.WriteStream;

  return { io: { input, output }, written, type: (keys: string) => input.emit('data', keys) };
}
