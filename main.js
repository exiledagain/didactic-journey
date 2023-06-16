function IsHangulSyllable (string) {
  return string.length === 1 && string.codePointAt(0) >= 0xAC00 && string.codePointAt(0) <= 0xD7A3
}

const BlockMap = new Map()
const RomanMap = new Map()
const JamoTable = {
  ᄀ: 'g',
  ᄁ: { text: 'kk', double: 'ᄁ' },
  ᄂ: 'n',
  ᄃ: 'd',
  ᄄ: { text: 'tt', double: 'ᄃ' },
  ᄅ: 'l',
  ᄆ: 'm',
  ᄇ: 'b',
  ᄈ: { text: 'pp', double: 'ᄇ' },
  ᄉ: 's',
  ᄊ: { text: 'ss', double: 'ᄉ' },
  ᄋ: '',
  ᄌ: 'j',
  ᄍ: { text: 'jj', double: 'ᄌ' },
  ᄎ: 'ch',
  ᄏ: 'k',
  ᄐ: 't',
  ᄑ: 'p',
  ᄒ: 'h',

  ᅡ: 'a',
  ᅢ: 'ae',
  ᅣ: 'ya',
  ᅤ: 'yae',
  ᅥ: 'eo',
  ᅦ: 'e',
  ᅧ: 'yeo',
  ᅨ: 'ye',
  ᅩ: 'o',
  ᅪ: 'wa',
  ᅫ: 'wae',
  ᅬ: 'oe',
  ᅭ: 'yo',
  ᅮ: 'u',
  ᅯ: 'wo',
  ᅰ: 'we',
  ᅱ: 'wi',
  ᅲ: 'yu',
  ᅳ: 'eu',
  ᅴ: 'ui',
  ᅵ: 'i',

  ᆨ: 'g',
  ᆩ: { text: 'gg', first: 'ᆨ', second: 'ᆨ' },
  ᆪ: { text: 'gs', first: 'ᆨ', second: 'ᆺ' },
  ᆫ: 'n',
  ᆬ: { text: 'nj', first: 'ᆫ', second: 'ᆽ' },
  ᆭ: { text: 'nh', first: 'ᆫ', second: 'ᇂ' },
  ᆮ: 'd',
  ᆯ: 'l',
  ᆰ: { text: 'lg', first: 'ᆯ', second: 'ᆨ' },
  ᆱ: { text: 'lm', first: 'ᆯ', second: 'ᆷ' },
  ᆲ: { text: 'lb', first: 'ᆯ', second: 'ᆸ' },
  ᆳ: { text: 'ls', first: 'ᆯ', second: 'ᆺ' },
  ᆴ: { text: 'lt', first: 'ᆯ', second: 'ᇀ' },
  ᆵ: { text: 'lp', first: 'ᆯ', second: 'ᇁ' },
  ᆶ: { text: 'lh', first: 'ᆯ', second: 'ᇂ' },
  ᆷ: 'm',
  ᆸ: 'b',
  ᆹ: { text: 'bs', first: 'ᆸ', second: 'ᆺ' },
  ᆺ: 's',
  ᆻ: { text: 'ss', first: 'ᆺ', second: 'ᆺ' },
  ᆼ: { text: 'ng', split: true },
  ᆽ: 'j',
  ᆾ: 'ch',
  ᆿ: 'k',
  ᇀ: 't',
  ᇁ: 'p',
  ᇂ: 'h'
}
const InverseVowelJamo = {}
const InverseLeadJamo = {}
const InverseTailJamo = {}

const ConfusionMap = new Map()
function IsConfusing (a, b) {
  if (ConfusionMap.has(a.at(-1))) {
    return ConfusionMap.get(a.at(-1)).has(b.at(0))
  }
  return false
}

function TransformHangulUnique (string) {
  const parts = []
  for (let i = 0, last; i < string.length; ++i) {
    const ch = string[i]
    if (IsHangulSyllable(ch)) {
      const current = ch.normalize('NFD')
      if (last && IsConfusing(last, current) && current[0] !== 'ᄋ') {
        parts.push('-')
      }
      for (const jamo of current) {
        if (!(jamo in JamoTable)) {
          throw new Error(jamo)
        }
        parts.push(JamoTable[jamo].text)
      }
      if (parts.length === current.length && current[0] === 'ᄋ') {
        parts[0] = ''
      }
      last = current
    } else {
      parts.push(ch)
      last = undefined
    }
  }
  return parts.join('')
}

function TransformRoughRoman (string) {
  const list = window.ParseHangeul(string)
  if (list.length === 0) {
    return string
  }
  let vowelUnguarded = true
  const res = []
  for (let i = 0; i < list.length; ++i) {
    const ch = list[i]
    switch (ch.type) {
      case 'lead':
        res.push(InverseLeadJamo[ch.text])
        vowelUnguarded = false
        break
      case 'vowel':
        if (vowelUnguarded) {
          res.push('ᄋ')
        }
        res.push(InverseVowelJamo[ch.text])
        vowelUnguarded = true
        break
      case 'tail':
        if (ch.text.length > 1 && i + 1 < list.length && list[i + 1].type === 'vowel') {
          res.push(InverseTailJamo[ch.text[0]])
          res.push(InverseLeadJamo[ch.text[1]])
          vowelUnguarded = false
        } else {
          res.push(InverseTailJamo[ch.text])
          vowelUnguarded = true
        }
        break
      case 'hyphen':
        break
      default:
        return string
    }
  }
  return res.join('')
}

function Transform (string) {
  if (IsHangulSyllable(string[0])) {
    return TransformHangulUnique(string)
  }
  return TransformRoughRoman(string)
}

function CompileText (string) {
  const ImportantSectionRegex = /(?:[\uAC00-\uD7A3]+|[abcdefghijklmnoprstuwy]+(?:-?[abcdefghijklmnoprstuwy]+)*)/igu
  return string.normalize().replace(ImportantSectionRegex, Transform).normalize()
}

function DoIO () {
  const input = document.querySelector('#input')
  const output = document.querySelector('#output')
  const text = input.value.normalize()
  output.value = CompileText(text)
}

function Setup () {
  const input = document.querySelector('#input')
  const events = [
    'change',
    'input'
  ]
  events.forEach(el => input.addEventListener(el, DoIO))
  const strings = []
  for (let i = 0xAC00; i <= 0xD7A3; ++i) {
    strings.push(String.fromCodePoint(i))
  }
  const blockMap = new Map()
  const offerBlock = array => {
    const chs = array.map(el => String.fromCodePoint(el))
    const roman = chs.map(ch => JamoTable[ch].text).join('')
    const block = chs.join('').normalize()
    RomanMap.set(roman, block)
    BlockMap.set(block, roman)
    blockMap.set(block, roman)
  }
  for (const jamo in JamoTable) {
    if (typeof JamoTable[jamo] !== 'object') {
      JamoTable[jamo] = {
        self: jamo,
        text: JamoTable[jamo]
      }
    } else {
      JamoTable[jamo].self = jamo
    }
  }
  for (let a = 0x1100; a <= 0x1112; ++a) {
    const ch = String.fromCodePoint(a)
    JamoTable[ch].leading = true
    InverseLeadJamo[JamoTable[ch].text] = ch
  }
  InverseLeadJamo.r = 'ᄅ'
  for (let b = 0x1161; b <= 0x1175; ++b) {
    const ch = String.fromCodePoint(b)
    JamoTable[ch].vowel = true
    InverseVowelJamo[JamoTable[ch].text] = ch
  }
  for (let c = 0x11A8; c <= 0x11C2; ++c) {
    const ch = String.fromCodePoint(c)
    JamoTable[ch].trailing = true
    InverseTailJamo[JamoTable[ch].text] = ch
    if (JamoTable[ch].text.indexOf('l') >= 0) {
      InverseTailJamo[JamoTable[ch].text.replace('l', 'r')] = ch
    }
  }
  // Hangul Syllable Composition Jamo: First Middle Last
  for (let a = 0x1100; a <= 0x1112; ++a) {
    for (let b = 0x1161; b <= 0x1175; ++b) {
      offerBlock([a, b])
      for (let c = 0x11A8; c <= 0x11C2; ++c) {
        offerBlock([a, b, c])
      }
    }
  }
  const tails = Object.values(JamoTable).filter(el => el.vowel || el.trailing)
  const heads = Object.values(JamoTable).filter(el => el.vowel || el.leading)
  JamoTable['ᄋ'].text = '-'
  const joinMap = new Map()
  tails.forEach(tail => {
    heads.forEach(head => {
      const el = `${tail.text}${head.text === 'ᄋ' ? '' : head.text}`
      const array = (joinMap.get(el) ?? [])
      array.push({
        text: el,
        tail,
        head
      })
      joinMap.set(el, array)
      if (tail.vowel && head.double) {
        const el = head.text
        const array = (joinMap.get(el) ?? [])
        array.push({
          text: el,
          tail,
          head
        })
        joinMap.set(el, array)
      }
    })
  })
  for (const [, v] of joinMap) {
    if (v.length > 1) {
      for (const el of v) {
        const set = ConfusionMap.get(el.tail.self) ?? new Set()
        set.add(el.head.self)
        ConfusionMap.set(el.tail.self, set)
      }
    }
  }
  InverseLeadJamo['-'] = 'ᄋ'
}

Setup()
