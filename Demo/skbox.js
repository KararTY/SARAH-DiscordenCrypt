// SECRET KEY ENCRYPTION BOX EXAMPLE
function skBox (sodium) {
  var hyper = window.hyperHTML
  var key = sodium.to_hex(sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES))

  var ClientCrypto = function (o = {
    privateKey: '',
    publicKey: '',
    getPublicKey: function () { return '' },
    skEncrypt: function (content = '', secret) { return '' },
    skDecrypt: function (content = '', secret) { return '' },
    pkEncrypt: function (content = '', publicKey) { return '' },
    pkDecrypt: function (content = '', publicKey) { return '' }
  }) {
    this.skEncrypt = function (content, secret) {
      var secretToBytes = sodium.from_hex(secret)
      var nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
      var nonceToHex = sodium.to_hex(nonce)
      // Nonce & CIPHER concatenation.
      return nonceToHex.concat(sodium.to_hex(sodium.crypto_secretbox_easy(content, nonce, secretToBytes)))
    }
    this.skDecrypt = function (nonceAndCipher, secret) {
      var secretToBytes = sodium.from_hex(secret)
      var nonceAndCipherToBytes = sodium.from_hex(nonceAndCipher)
      if (nonceAndCipherToBytes.length < sodium.crypto_secretbox_NONCEBYTES + sodium.crypto_secretbox_MACBYTES) {
        return new Error('Ciphertext is too short.')
      }
      var nonce = nonceAndCipherToBytes.slice(0, sodium.crypto_secretbox_NONCEBYTES)
      var ciphertext = nonceAndCipherToBytes.slice(sodium.crypto_secretbox_NONCEBYTES)
      return sodium.to_string(sodium.crypto_secretbox_open_easy(ciphertext, nonce, secretToBytes))
    }
    this.getPublicKey = function () {
      if (!this.publicKey && !this.privateKey) {
        let keypair = sodium.crypto_box_keypair()
        this.publicKey = sodium.to_hex(keypair.publicKey)
        this.privateKey = sodium.to_hex(keypair.privateKey)
      }
      return this.publicKey
    }
    console.log(this.getPublicKey()) // Auto run.
    this.pkEncrypt = function (content, publicKey) {
      let nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
      let cipher = sodium.crypto_box_easy(content, nonce, sodium.from_hex(publicKey), sodium.from_hex(this.privateKey))
      let message = sodium.to_hex(nonce).concat(sodium.to_hex(cipher))
      return message
    }
    this.pkDecrypt = function (content, publicKey) {
      let nonceAndCipherToBytes = sodium.from_hex(content)
      let nonce = nonceAndCipherToBytes.slice(0, sodium.crypto_secretbox_NONCEBYTES)
      let cipher = nonceAndCipherToBytes.slice(sodium.crypto_secretbox_NONCEBYTES)
      let messageBytes = sodium.crypto_box_open_easy(cipher, nonce, sodium.from_hex(publicKey), sodium.from_hex(this.privateKey))
      return sodium.to_string(messageBytes)
    }
  }

  var cryptoUserOne = new ClientCrypto()
  var notMilitaryTime = !!new Date(Date.now()).toLocaleString().match(/am|pm/i)

  function skInputMsgDown (e = new KeyboardEvent()) {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault() // Don't make a new text area row, please.
    }
  }
  function skInputMsgUp (e = new KeyboardEvent()) {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && e.srcElement.value.length > 0) {
      e.preventDefault()
      skNewMessage({
        author: `${navigator.platform} ${navigator.language} ${navigator.vendor}`,
        timestamp: Date.now(),
        message: cryptoUserOne.skEncrypt(e.srcElement.value, key)
      })
      e.srcElement.value = '' // Reset value
    }
  }
  function skDecryptMessage (e = new MouseEvent()) {
    if (e.srcElement.getAttribute('disabled')) return console.log('Already decrypted.')
    try {
      var message = cryptoUserOne.skDecrypt(e.srcElement.parentElement.parentElement.querySelector('p.encryptedMessage').innerText, key)
      e.srcElement.parentElement.parentElement.querySelector('p.encryptedMessage').innerText = message
      e.srcElement.parentElement.parentElement.querySelector('p.encryptedMessage').classList.add('decryptedMessage')
      e.srcElement.parentElement.parentElement.querySelector('p.encryptedMessage').classList.remove('encryptedMessage')
      e.srcElement.innerText = 'Decrypted.'
      e.srcElement.setAttribute('disabled', 'disabled')
    } catch (err) {
      if (err.message === 'wrong secret key for the given ciphertext') {
        e.srcElement.innerText = 'Error, check console.'
        e.srcElement.setAttribute('title', err.message)
        throw err
      }
    }
  }
  function createChatUI () {
    hyper.bind(document.getElementById('sk'))`
      <div class="section">
        <div class="container">
          <div class="columns">
            <div class="column">
              <div class="box">
                <div class="messageWrapper" style="max-height:calc(100vh - 200px);padding:1rem;overflow:auto;overflow-x:hidden;"></div>
                <br/>
                <textarea class="textarea" onkeydown=${skInputMsgDown} onkeyup=${skInputMsgUp} placeholder="Type in your message..." rows="1"></textarea>
              </div>
            </div>
          </div>
          <hr>
          <pre class="privKey">${key}</pre>
          <a onclick=${function () { key = sodium.to_hex(sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES)); document.getElementById('sk').querySelector('.privKey').innerText = key }}>Randomize</a>
        </div>
      </div>
    `
  }
  createChatUI() // Create chat user interface.

  // Should be called AFTER message is successfully decrypted.
  function skNewMessage (obj = { author: '', timestamp: 0, message: '' }) {
    if (typeof obj !== 'object') throw new Error('skNewMessage argument is not an object.')
    document.getElementById('sk').querySelector('.messageWrapper').appendChild(hyper.wire()`
      <div class="box content" style="word-break:break-word;">
        <strong>${obj.author}</strong> <small><span title="${window.moment(obj.timestamp).format()}">${window.moment(obj.timestamp).format(notMilitaryTime ? 'h:mm a' : 'HH:mm')}</span> <a onclick=${skDecryptMessage}>Decrypt</a> </small>
        <p class="encryptedMessage">${obj.message}</p>
      </div>
    `)
  }
}
