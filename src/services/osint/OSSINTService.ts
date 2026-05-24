/**
 * OSINT Service — Integración con CODART API
 * Consultas de DNI, RUC, búsqueda por nombre, teléfonos, placas (Perú)
 */

const BASE_URL = 'https://api-codart.cgrt.org/api/v1/consultas'
let authToken = ''

export function setOSINTToken(token: string) {
  authToken = token
}

async function fetchOSINT(endpoint: string) {
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || `OSINT error: ${res.status}`)
  }
  return res.json()
}

// === Tier 1: Request-based (sin créditos) ===

export async function queryDNI(dni: string) {
  return fetchOSINT(`reniec/dni/${dni}`)
}

export async function queryRUC(ruc: string) {
  return fetchOSINT(`sunat/ruc/${ruc}`)
}

// === Tier 2: Credit-based ===

export async function queryDNIFull(dni: string) {
  return fetchOSINT(`fd/dni/${dni}`)
}

export async function queryDNIT(dni: string) {
  return fetchOSINT(`fd/dnit/${dni}`)
}

export async function searchByName(n1: string, ap1: string, ap2: string) {
  return fetchOSINT(`fd/nm?n1=${encodeURIComponent(n1)}&ap1=${encodeURIComponent(ap1)}&ap2=${encodeURIComponent(ap2)}`)
}

export async function queryFamilyGraph(dni: string) {
  return fetchOSINT(`fd/ag/${dni}`)
}

export async function queryPhoneByDNI(dni: string) {
  return fetchOSINT(`fd/telp/${dni}`)
}

export async function queryPhoneByCell(numero: string) {
  return fetchOSINT(`fd/telp/cel/${numero}`)
}

export async function queryPlate(placa: string) {
  return fetchOSINT(`fd/pla/${placa}`)
}

// === Smart query: detecta automáticamente el tipo ===

export interface OSINTResult {
  type: 'dni' | 'dni_full' | 'ruc' | 'name_search' | 'family' | 'phone_dni' | 'phone_cell' | 'plate' | 'unknown'
  data: unknown
  query: string
}

export async function smartQuery(input: string): Promise<OSINTResult> {
  // Limpiar prefijos comunes y palabras de relleno
  const cleaned = input
    .trim()
    .replace(/^(buscar|consultar|dame|info|datos|informaci[oó]n|verificar|ver|revisar|chequear|buscar\s+datos\s+(de|del|sobre))\s+/i, '')
    .replace(/^(de|del|sobre|para|el|la|los|las|un|una)\s+/i, '')
    .trim()

  // Extraer números del input (para queries como "dni 12345678", "mi dni 12345678 porfa")
  const dniMatch = cleaned.match(/\b(\d{8})\b/)
  const rucMatch = cleaned.match(/\b(\d{11})\b/)
  const cellMatch = cleaned.match(/\b(9\d{8})\b/)
  const plateMatch = cleaned.match(/\b([A-Z0-9]{6,7})\b/i)

  // Detectar keywords de tipo de consulta
  const hasDniKeyword = /\b(dni|documento|reniec|cedula)\b/i.test(cleaned)
  const hasRucKeyword = /\b(ruc|sunat|empresa)\b/i.test(cleaned)
  const hasFullKeyword = /\b(full|completo|fd|extendido)\b/i.test(cleaned)
  const hasFamilyKeyword = /\b(familia|familiares|family|ag|familiar|pariente)\b/i.test(cleaned)
  const hasPhoneKeyword = /\b(telefon|telf|telp|celular|fono)\b/i.test(cleaned)
  const hasCellKeyword = /\b(celular|cel|movil|whatsapp|wa)\b/i.test(cleaned)

  // === DNI Full (credit-based) ===
  if (dniMatch && hasFullKeyword) {
    const data = await queryDNIFull(dniMatch[1])
    return { type: 'dni_full', data, query: dniMatch[1] }
  }

  // === Familia (credit-based) ===
  if (dniMatch && hasFamilyKeyword) {
    const data = await queryFamilyGraph(dniMatch[1])
    return { type: 'family', data, query: dniMatch[1] }
  }

  // === Teléfono por DNI (credit-based) ===
  if (dniMatch && hasPhoneKeyword && !hasCellKeyword) {
    const data = await queryPhoneByDNI(dniMatch[1])
    return { type: 'phone_dni', data, query: dniMatch[1] }
  }

  // === RUC: 11 dígitos (o keyword + número) ===
  if (rucMatch && !hasDniKeyword) {
    const data = await queryRUC(rucMatch[1])
    return { type: 'ruc', data, query: rucMatch[1] }
  }
  if (hasRucKeyword && dniMatch) {
    // "ruc 12345678" — podría ser RUC con dígitos de menos, intentar igual
    const digits = cleaned.replace(/\D/g, '')
    if (digits.length === 11) {
      const data = await queryRUC(digits)
      return { type: 'ruc', data, query: digits }
    }
  }

  // === DNI: 8 dígitos (Tier 1 — gratis) ===
  if (dniMatch) {
    const data = await queryDNI(dniMatch[1])
    return { type: 'dni', data, query: dniMatch[1] }
  }

  // === Celular: 9 dígitos empezando con 9 ===
  if (cellMatch) {
    const data = await queryPhoneByCell(cellMatch[1])
    return { type: 'phone_cell', data, query: cellMatch[1] }
  }

  // === Placa: 6-7 alfanuméricos con al menos 1 letra y 1 dígito ===
  if (plateMatch) {
    const p = plateMatch[1]
    if (/[A-Z]/i.test(p) && /\d/.test(p)) {
      const data = await queryPlate(p)
      return { type: 'plate', data, query: p }
    }
  }

  // === Nombre: "Apellido1 Apellido2, Nombre" o "Nombre Apellido1 Apellido2" ===
  const nameInput = cleaned.replace(/^(nombre|buscar|datos|persona)\s+(de\s+)?/i, '').trim()
  const nameParts = nameInput.includes(',')
    ? nameInput.split(',').map(s => s.trim())
    : nameInput.split(/\s+/)

  if (nameParts.length >= 3) {
    const [ap1, ap2] = nameInput.includes(',')
      ? [nameParts[0].split(' ')[0], nameParts[0].split(' ').slice(1).join(' ')]
      : [nameParts[nameParts.length - 2], nameParts[nameParts.length - 1]]

    if (ap1 && ap2 && ap1.length > 1 && ap2.length > 1) {
      const n1 = nameInput.includes(',') ? nameParts[1] : nameParts.slice(0, -2).join(' ')
      const data = await searchByName(n1, ap1, ap2)
      return { type: 'name_search', data, query: nameInput }
    }
  }

  // === Near-miss: solo dígitos pero longitud incorrecta ===
  const onlyDigits = cleaned.replace(/\D/g, '')
  if (onlyDigits.length >= 7 && onlyDigits.length <= 14 && onlyDigits.length !== 8 && onlyDigits.length !== 9 && onlyDigits.length !== 11) {
    // Intentar extraer un DNI de 8 dígitos dentro del número
    const embeddedDni = onlyDigits.match(/\d{8}/)
    if (embeddedDni) {
      const data = await queryDNI(embeddedDni[0])
      return { type: 'dni', data, query: embeddedDni[0] }
    }
    // Intentar extraer un RUC de 11 dígitos
    const embeddedRuc = onlyDigits.match(/\d{11}/)
    if (embeddedRuc) {
      const data = await queryRUC(embeddedRuc[0])
      return { type: 'ruc', data, query: embeddedRuc[0] }
    }
    // No se pudo extraer, dar guía específica
    return {
      type: 'unknown',
      data: {
        message: `Detecté \`${onlyDigits}\` (${onlyDigits.length} dígitos), pero no coincide con ningún formato:\n\n` +
          `- **DNI** = 8 dígitos\n` +
          `- **RUC** = 11 dígitos\n` +
          `- **Celular** = 9 dígitos (empieza con 9)\n\n` +
          'Si tu número es un DNI, escribe solo los 8 dígitos.'
      },
      query: input,
    }
  }

  return {
    type: 'unknown',
    data: {
      message: 'Formato no reconocido. Puedo consultar:\n\n' +
        '- **DNI**: escribe 8 dígitos (ej: `12345678`)\n' +
        '- **RUC**: escribe 11 dígitos (ej: `20123456789`)\n' +
        '- **Celular**: escribe 9 dígitos empezando con 9 (ej: `987654321`)\n' +
        '- **Placa**: escribe la placa (ej: `ABC123`)\n' +
        '- **Nombre**: `Apellido1 Apellido2, Nombre`\n\n' +
        'También puedes usar comandos: `dni full 12345678`, `familia 12345678`, `telefono 12345678`'
    },
    query: input,
  }
}
