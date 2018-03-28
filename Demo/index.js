window.sodium = {
  onload: function (sodium) {
    var hyper = window.hyperHTML
    var key = sodium.to_hex(sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES))

    var ClientCrypto = function (o = {
      privateKey: '',
      publicKey: '',
      // getpkKeypair: function () { return '' },
      secretEncrypt: function (content = '', secret) { return '' },
      secretDecrypt: function (content = '', secret) { return '' },
      pkEncrypt: function (content = '', publicKey) { return '' },
      pkDecrypt: function (content = '') { return '' }
    }) {
      this.secretEncrypt = function (content, secret) {
        var secretToBytes = sodium.from_hex(secret)
        var nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
        var nonceToHex = sodium.to_hex(nonce)
        // Nonce & CIPHER concatenation.
        return nonceToHex.concat(sodium.to_hex(sodium.crypto_secretbox_easy(content, nonce, secretToBytes)))
      }
      this.secretDecrypt = function (nonceAndCipher, secret) {
        var secretToBytes = sodium.from_hex(secret)
        var nonceAndCipherToBytes = sodium.from_hex(nonceAndCipher)
        if (nonceAndCipherToBytes.length < sodium.crypto_secretbox_NONCEBYTES + sodium.crypto_secretbox_MACBYTES) {
          return new Error('Ciphertext is too short.')
        }
        var nonce = nonceAndCipherToBytes.slice(0, sodium.crypto_secretbox_NONCEBYTES)
        var ciphertext = nonceAndCipherToBytes.slice(sodium.crypto_secretbox_NONCEBYTES)
        return sodium.to_string(sodium.crypto_secretbox_open_easy(ciphertext, nonce, secretToBytes))
      }
      // this.getpkKeypair = function () {
      //  this.publicKey = ''
      //   return this.publicKey
      // }
      // this.pkEncrypt = function (content, publicKey) {
      //   return encrypt(content)
      // }
      // this.pkDecrypt = function (content) {
      //   return decrypt(content)
      // }
    }

    var cryptoUserOne = new ClientCrypto()
    var notMilitaryTime = !!new Date(Date.now()).toLocaleString().match(/am|pm/i)

    function inputMsgDown (e = new KeyboardEvent()) {
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault() // Don't make a new text area row, please.
      }
    }
    function inputMsgUp (e = new KeyboardEvent()) {
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey && e.srcElement.value.length > 0) {
        e.preventDefault()
        newMessage({
          author: `${navigator.platform} ${navigator.language} ${navigator.vendor}`,
          timestamp: Date.now(),
          message: cryptoUserOne.secretEncrypt(e.srcElement.value, key)
        })
        e.srcElement.value = '' // Reset value
      }
    }
    function decryptMessage (e = new MouseEvent()) {
      if (e.srcElement.getAttribute('disabled')) return console.log('Already decrypted.')
      try {
        var message = cryptoUserOne.secretDecrypt(e.srcElement.parentElement.parentElement.querySelector('p.encryptedMessage').innerText, key)
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
      hyper.bind(document.body)`
        <div class="section">
          <div class="container">
            <div class="columns">
              <div class="column">
                <div class="box">
                  <div id="messageWrapper" style="max-height:calc(100vh - 200px);padding:1rem;overflow:auto;overflow-x:hidden;"></div>
                  <br/>
                  <textarea class="textarea" onkeydown=${inputMsgDown} onkeyup=${inputMsgUp} placeholder="Type in your message..." rows="1"></textarea>
                </div>
              </div>
            </div>
            <hr>
            <pre id="privKey">${key}</pre>
            <a onclick=${function () { key = sodium.to_hex(sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES)); document.getElementById('privKey').innerText = key }}>Randomize</a>
          </div>
        </div>
      `
    }
    createChatUI() // Create chat user interface.

    // Should be called AFTER message is successfully decrypted.
    function newMessage (obj = { author: '', timestamp: 0, message: '' }) {
      if (typeof obj !== 'object') throw new Error('newMessage argument is not an object.')
      document.getElementById('messageWrapper').appendChild(hyper.wire()`
        <div class="box content" style="word-break:break-word;">
          <strong>${obj.author}</strong> <small><span title="${window.moment(obj.timestamp).format()}">${window.moment(obj.timestamp).format(notMilitaryTime ? 'h:mm a' : 'HH:mm')}</span> <a onclick=${decryptMessage}>Decrypt</a> </small>
          <p class="encryptedMessage">${obj.message}</p>
        </div>
      `)
    }
  }
}
