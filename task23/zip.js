"use strict";

(function exposeZipBuilder(globalObject) {
  const encoder = new TextEncoder();
  let crcTable = null;

  function getCrcTable() {
    if (crcTable) {
      return crcTable;
    }

    crcTable = new Uint32Array(256);
    for (let value = 0; value < 256; value += 1) {
      let crc = value;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
      }
      crcTable[value] = crc >>> 0;
    }
    return crcTable;
  }

  function crc32(bytes) {
    const table = getCrcTable();
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function asBytes(data) {
    if (data instanceof Uint8Array) {
      return data;
    }
    return encoder.encode(String(data));
  }

  function makeHeader(length) {
    const bytes = new Uint8Array(length);
    return { bytes, view: new DataView(bytes.buffer) };
  }

  function zipDateTime(date) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time:
        (date.getHours() << 11) |
        (date.getMinutes() << 5) |
        Math.floor(date.getSeconds() / 2),
      date:
        ((year - 1980) << 9) |
        ((date.getMonth() + 1) << 5) |
        date.getDate(),
    };
  }

  function buildZip(files) {
    const localParts = [];
    const centralParts = [];
    const stamp = zipDateTime(new Date());
    let localOffset = 0;
    let centralSize = 0;

    for (const file of files) {
      const name = encoder.encode(file.name.replaceAll("\\", "/"));
      const data = asBytes(file.data);
      const checksum = crc32(data);

      const local = makeHeader(30);
      local.view.setUint32(0, 0x04034b50, true);
      local.view.setUint16(4, 20, true);
      local.view.setUint16(6, 0x0800, true);
      local.view.setUint16(8, 0, true);
      local.view.setUint16(10, stamp.time, true);
      local.view.setUint16(12, stamp.date, true);
      local.view.setUint32(14, checksum, true);
      local.view.setUint32(18, data.length, true);
      local.view.setUint32(22, data.length, true);
      local.view.setUint16(26, name.length, true);
      local.view.setUint16(28, 0, true);
      localParts.push(local.bytes, name, data);

      const central = makeHeader(46);
      central.view.setUint32(0, 0x02014b50, true);
      central.view.setUint16(4, 20, true);
      central.view.setUint16(6, 20, true);
      central.view.setUint16(8, 0x0800, true);
      central.view.setUint16(10, 0, true);
      central.view.setUint16(12, stamp.time, true);
      central.view.setUint16(14, stamp.date, true);
      central.view.setUint32(16, checksum, true);
      central.view.setUint32(20, data.length, true);
      central.view.setUint32(24, data.length, true);
      central.view.setUint16(28, name.length, true);
      central.view.setUint16(30, 0, true);
      central.view.setUint16(32, 0, true);
      central.view.setUint16(34, 0, true);
      central.view.setUint16(36, 0, true);
      central.view.setUint32(38, 0, true);
      central.view.setUint32(42, localOffset, true);
      centralParts.push(central.bytes, name);

      localOffset += local.bytes.length + name.length + data.length;
      centralSize += central.bytes.length + name.length;
    }

    const end = makeHeader(22);
    end.view.setUint32(0, 0x06054b50, true);
    end.view.setUint16(4, 0, true);
    end.view.setUint16(6, 0, true);
    end.view.setUint16(8, files.length, true);
    end.view.setUint16(10, files.length, true);
    end.view.setUint32(12, centralSize, true);
    end.view.setUint32(16, localOffset, true);
    end.view.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, end.bytes], {
      type: "application/zip",
    });
  }

  globalObject.PrintZip = { buildZip };
})(typeof window === "undefined" ? globalThis : window);
