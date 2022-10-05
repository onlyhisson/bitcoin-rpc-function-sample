const decodedTxidInfo = {
  txid: "5036b1f58d512b22e4e5f0a9d673808856c6290af3d15bf8df23a954bf03a803",
  hash: "6a77c274d87f65f7fec43bf384d322d00c71fe0c0be8df78c9cf5ad0d36aa274",
  version: 1,
  size: 1000, // 트랜잭션 사이즈
  vsize: 508, // 가장 트랜잭션 사이즈, witness 트랙잭션과 사이즈 다름
  weight: 2032, // vsize * 4 -3 ~ vsize * 4 사이
  locktime: 0,
  vin: [
    {
      txid: "5b4c99e42856bf7c0b0fee1407233ed2b9911735bd7a56d6548e366b31cd3dd9",
      vout: 2, // output number
      // 전자 서명, 송신자가 자신의 개인키로 이 transation 데이터에 서명한 것
      // 이전 UTXO의 output에 Script pubKey로 잠긴 잠금 장치를 풀 수 있는 열쇠 역할
      scriptSig: {
        asm: "002063d3972aec2411ca7d281e5d0b6843fb9561cab93fa50a208e9deb20336a01e0",
        hex: "22002063d3972aec2411ca7d281e5d0b6843fb9561cab93fa50a208e9deb20336a01e0",
      },
      txinwitness: [
        "",
        "3044022003466770f70babdbd79a44d3bbdd6f5746c0cefde4a218a1a4fa696cbf54db7e02203361f5383f269c74e708bd30c20bc8781703785cf21bbba2fefb649e4d42e8eb01",
        "304402201b11abdf9b8a910c67602cc20a152a5570f8a1c2b65a151e14769faefce848590220783ee9398ea1c4df5390d25bd0056a650e48989ac6754f45c5666f6555443b5901",
        "52210335041dc5eeb0fbfd25dee759047005fa4dd26d1965cfad380ed71fda5b2a61b92103529fa816c9c3dfb07b59ed036a387c32285f9afade836e90c7dd1f0491ec417352ae",
      ],
      sequence: 4294967295,
    },
    {
      txid: "9d2078145e2a5c5dc99a91ec358709f0f83ce0039a33f2f89959ec16f4a57e27",
      vout: 2,
      scriptSig: {
        asm: "0020dc3e8d3d8246f771093d2b764fd17773c8663ab44fa9a8b65f6854fcbf892499",
        hex: "220020dc3e8d3d8246f771093d2b764fd17773c8663ab44fa9a8b65f6854fcbf892499",
      },
      txinwitness: [
        "",
        "304402200164a293effc2c39ede120afe4cc1bc2d0c55332e4b92e679104b677d97e888e0220653a90a71415212bf3e30fc3d0ca70f89e066600ab83999a1ca8656701b5b7b901",
        "304402207450b2ba3191bb73266bcc073ce5aa412ca8a5f43a76a6c3b84b1f03a755d1cd0220722f75fac2ac10e43b50f731a6315b85b0c7ff6a223579a6c4502eb5c13b55f701",
        "522103dd199897bced6b99ffcf704139430093c5d875528599b825e2ad543e3daab41b2103529fa816c9c3dfb07b59ed036a387c32285f9afade836e90c7dd1f0491ec417352ae",
      ],
      sequence: 4294967295,
    },
    {
      txid: "054cbc2c9c8d02f802f639e098de0b562742a6bea2f783c919793cfb12f94b3a",
      vout: 2,
      scriptSig: {
        asm: "0020a17816b7429ad550f8fef7145e5cce540b4e6e2db81dcd2b5ea8199e879dde03",
        hex: "220020a17816b7429ad550f8fef7145e5cce540b4e6e2db81dcd2b5ea8199e879dde03",
      },
      txinwitness: [
        "",
        "3044022050ecfe8d39a8e437a9be55953f306db3f614d1d104751112f4f9f3f727c0bba0022064a9838bf861becd500d86c391bd13ddad50090ede4ac83a1d8656f4e14360cb01",
        "3044022072983f06bdee269d60f36bf50a5f9a4e3ec28fd6778161c8b57c6bef347b6bb6022044b706f3c37b8a9c36a65f74927b12949c681880c97ca308dec9a869c57a21b301",
        "522103c8f000d8b98ad521ac5c5da28c0f4310e940f390f43a78973684e5b19570ae432103529fa816c9c3dfb07b59ed036a387c32285f9afade836e90c7dd1f0491ec417352ae",
      ],
      sequence: 4294967295,
    },
  ],
  vout: [
    {
      value: 0.09704294,
      n: 0,
      scriptPubKey: {
        asm: "0 47db2a3bd6fb09b2a13a8e76e86785be0dbbbf70",
        hex: "001447db2a3bd6fb09b2a13a8e76e86785be0dbbbf70",
        address: "bc1qgldj5w7klvym9gf63emwseu9hcxmh0msqldpez",
        type: "witness_v0_keyhash",
      },
    },
    {
      value: 0.00097043,
      n: 1,
      scriptPubKey: {
        asm: "0 857e53278858c87f5216538cff8712d49ea15a13c2bbb08098eed621ddbacbf8",
        hex: "0020857e53278858c87f5216538cff8712d49ea15a13c2bbb08098eed621ddbacbf8",
        address:
          "bc1qs4l9xfugtry875sk2wx0lpcj6j02zksnc2ampqycamtzrhd6e0uq9aj3ej",
        type: "witness_v0_scripthash",
      },
    },
    {
      value: 0.03655769,
      n: 2,
      scriptPubKey: {
        asm: "OP_HASH160 156cb3b768ac87060199757a09baede10cb41447 OP_EQUAL",
        hex: "a914156cb3b768ac87060199757a09baede10cb4144787",
        address: "33eJLKZK3uKWiyV9E2UjottvsJ8gk2WKmg",
        type: "scripthash",
      },
    },
  ],
};
