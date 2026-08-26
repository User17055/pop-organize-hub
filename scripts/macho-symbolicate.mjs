// Leitor minimo de Mach-O 64: confere o UUID e resolve deslocamentos para nome de simbolo.
// Existe porque `atos` e `nm` sao do macOS e esta maquina e Windows. Para saber QUAL funcao
// esta num deslocamento do relatorio de crash, basta a tabela de simbolos (LC_SYMTAB): pega-se
// o simbolo de maior endereco que ainda seja <= o alvo. E o mesmo que o `atos` faz na pior das
// hipoteses, sem informacao de linha.
import { readFileSync } from "node:fs";

const path = process.argv[2];
const offsets = process.argv.slice(3).map(Number);
const buf = readFileSync(path);

const MH_MAGIC_64 = 0xfeedfacf;
const LC_SEGMENT_64 = 0x19;
const LC_SYMTAB = 0x02;
const LC_UUID = 0x1b;

const magic = buf.readUInt32LE(0);
if (magic !== MH_MAGIC_64) {
  console.error("magic inesperado 0x" + magic.toString(16) + " (fat binary? big endian?)");
  process.exit(1);
}

const ncmds = buf.readUInt32LE(16);
let p = 32;
let textVmaddr = null;
let symtab = null;
let uuid = null;

for (let i = 0; i < ncmds; i++) {
  const cmd = buf.readUInt32LE(p);
  const cmdsize = buf.readUInt32LE(p + 4);
  if (cmd === LC_SEGMENT_64) {
    const name = buf.toString("utf8", p + 8, p + 24).replace(/\0+$/, "");
    if (name === "__TEXT") textVmaddr = Number(buf.readBigUInt64LE(p + 24));
  } else if (cmd === LC_SYMTAB) {
    symtab = {
      symoff: buf.readUInt32LE(p + 8),
      nsyms: buf.readUInt32LE(p + 12),
      stroff: buf.readUInt32LE(p + 16),
      strsize: buf.readUInt32LE(p + 20),
    };
  } else if (cmd === LC_UUID) {
    uuid = buf.toString("hex", p + 8, p + 24);
  }
  p += cmdsize;
}

if (uuid) {
  const d = (a, b) => uuid.slice(a, b);
  console.log("UUID do binario: " + [d(0, 8), d(8, 12), d(12, 16), d(16, 20), d(20, 32)].join("-"));
}
console.log("__TEXT vmaddr: 0x" + (textVmaddr ?? 0).toString(16));

if (!symtab || symtab.nsyms === 0) {
  console.log("SEM tabela de simbolos -- binario despojado (stripped).");
  process.exit(0);
}
console.log("simbolos na tabela: " + symtab.nsyms);

// N_STAB = 0xe0 (entradas de depuracao), N_TYPE = 0x0e, N_SECT = 0x0e
const syms = [];
for (let i = 0; i < symtab.nsyms; i++) {
  const o = symtab.symoff + i * 16;
  const n_strx = buf.readUInt32LE(o);
  const n_type = buf.readUInt8(o + 4);
  const n_value = Number(buf.readBigUInt64LE(o + 8));
  if (n_type & 0xe0) continue; // stab
  if ((n_type & 0x0e) !== 0x0e) continue; // so simbolos de secao
  if (n_value === 0 || n_strx === 0) continue;
  let end = buf.indexOf(0, symtab.stroff + n_strx);
  syms.push({ addr: n_value, name: buf.toString("utf8", symtab.stroff + n_strx, end) });
}
syms.sort((a, b) => a.addr - b.addr);
console.log("simbolos utilizaveis: " + syms.length);

function resolve(target) {
  let lo = 0,
    hi = syms.length - 1,
    best = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (syms[mid].addr <= target) {
      best = syms[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

console.log("");
for (const off of offsets) {
  const target = (textVmaddr ?? 0) + off;
  const s = resolve(target);
  if (!s) {
    console.log(off + "  ->  (nada abaixo deste endereco)");
    continue;
  }
  console.log(off + "  ->  " + s.name + "  +" + (target - s.addr));
}
