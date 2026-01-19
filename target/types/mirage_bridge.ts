/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/mirage_bridge.json`.
 */
export type MirageBridge = {
  "address": "8uTqBhqHt8BCJNdS7aDX7vUXHmABevhqwyQsAoxv4jx9",
  "metadata": {
    "name": "mirageBridge",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "burn",
      "discriminator": [
        116,
        110,
        29,
        56,
        107,
        219,
        42,
        93
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "bridgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  114,
                  105,
                  100,
                  103,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "burnRecord",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "burnParams"
            }
          }
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "bridgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  114,
                  105,
                  100,
                  103,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "validatorRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "initializeParams"
            }
          }
        }
      ]
    },
    {
      "name": "mint",
      "discriminator": [
        51,
        57,
        225,
        47,
        182,
        146,
        137,
        166
      ],
      "accounts": [
        {
          "name": "orchestrator",
          "writable": true,
          "signer": true
        },
        {
          "name": "recipient"
        },
        {
          "name": "recipientTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipient"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "tokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "bridgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  114,
                  105,
                  100,
                  103,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "mintRecord",
          "writable": true
        },
        {
          "name": "validatorRegistry",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "mintParams"
            }
          }
        }
      ]
    },
    {
      "name": "pause",
      "discriminator": [
        211,
        22,
        221,
        251,
        74,
        121,
        193,
        47
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "bridgeConfig"
          ]
        },
        {
          "name": "bridgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  114,
                  105,
                  100,
                  103,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "unpause",
      "discriminator": [
        169,
        144,
        4,
        38,
        10,
        141,
        188,
        255
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "bridgeConfig"
          ]
        },
        {
          "name": "bridgeConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  114,
                  105,
                  100,
                  103,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "updateValidators",
      "discriminator": [
        211,
        66,
        122,
        122,
        121,
        107,
        148,
        111
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "bridgeConfig"
          ]
        },
        {
          "name": "bridgeConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  114,
                  105,
                  100,
                  103,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "validatorRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  108,
                  105,
                  100,
                  97,
                  116,
                  111,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "updateValidatorsParams"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bridgeConfig",
      "discriminator": [
        40,
        206,
        51,
        233,
        246,
        40,
        178,
        85
      ]
    },
    {
      "name": "burnRecord",
      "discriminator": [
        27,
        29,
        36,
        29,
        86,
        125,
        167,
        239
      ]
    },
    {
      "name": "mintRecord",
      "discriminator": [
        47,
        252,
        142,
        126,
        241,
        162,
        116,
        188
      ]
    },
    {
      "name": "validatorRegistry",
      "discriminator": [
        168,
        113,
        195,
        186,
        62,
        121,
        163,
        230
      ]
    }
  ],
  "events": [
    {
      "name": "bridgePaused",
      "discriminator": [
        41,
        254,
        108,
        64,
        12,
        9,
        240,
        203
      ]
    },
    {
      "name": "bridgeUnpaused",
      "discriminator": [
        214,
        161,
        53,
        140,
        23,
        147,
        245,
        130
      ]
    },
    {
      "name": "burnInitiated",
      "discriminator": [
        243,
        164,
        188,
        3,
        115,
        127,
        6,
        219
      ]
    },
    {
      "name": "mintAttested",
      "discriminator": [
        107,
        87,
        114,
        6,
        10,
        193,
        208,
        139
      ]
    },
    {
      "name": "mintCompleted",
      "discriminator": [
        234,
        65,
        17,
        174,
        104,
        22,
        108,
        91
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidChainId",
      "msg": "Chain ID cannot be empty"
    },
    {
      "code": 6001,
      "name": "invalidThreshold",
      "msg": "Attestation threshold must be between 1 and 10000"
    },
    {
      "code": 6002,
      "name": "invalidAmount",
      "msg": "Amount must be greater than 0"
    },
    {
      "code": 6003,
      "name": "bridgePaused",
      "msg": "Bridge is paused"
    },
    {
      "code": 6004,
      "name": "invalidMirageRecipient",
      "msg": "Invalid Mirage recipient address"
    },
    {
      "code": 6005,
      "name": "nonceOverflow",
      "msg": "Burn nonce overflow"
    },
    {
      "code": 6006,
      "name": "amountOverflow",
      "msg": "Amount overflow"
    },
    {
      "code": 6007,
      "name": "unauthorizedOrchestrator",
      "msg": "Unauthorized orchestrator"
    },
    {
      "code": 6008,
      "name": "invalidValidatorSet",
      "msg": "Invalid validator set (zero total power)"
    },
    {
      "code": 6009,
      "name": "burnHashMismatch",
      "msg": "Burn hash mismatch with existing record"
    },
    {
      "code": 6010,
      "name": "recipientMismatch",
      "msg": "Recipient mismatch with existing record"
    },
    {
      "code": 6011,
      "name": "amountMismatch",
      "msg": "Amount mismatch with existing record"
    },
    {
      "code": 6012,
      "name": "alreadyAttested",
      "msg": "Already attested"
    },
    {
      "code": 6013,
      "name": "tooManyAttestors",
      "msg": "Too many attestors"
    },
    {
      "code": 6014,
      "name": "powerOverflow",
      "msg": "Power overflow"
    },
    {
      "code": 6015,
      "name": "invalidSignatureInstruction",
      "msg": "Invalid Ed25519 signature instruction"
    },
    {
      "code": 6016,
      "name": "signaturePubkeyMismatch",
      "msg": "Signature pubkey mismatch"
    },
    {
      "code": 6017,
      "name": "signatureMessageMismatch",
      "msg": "Signature message mismatch"
    },
    {
      "code": 6018,
      "name": "alreadyCompleted",
      "msg": "Already completed"
    },
    {
      "code": 6019,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6020,
      "name": "emptyValidatorSet",
      "msg": "Validator set cannot be empty"
    },
    {
      "code": 6021,
      "name": "tooManyValidators",
      "msg": "Too many validators"
    }
  ],
  "types": [
    {
      "name": "bridgeConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "mirageChainId",
            "type": "string"
          },
          {
            "name": "attestationThreshold",
            "type": "u64"
          },
          {
            "name": "totalMinted",
            "type": "u64"
          },
          {
            "name": "totalBurned",
            "type": "u64"
          },
          {
            "name": "burnNonce",
            "type": "u64"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bridgePaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "bridgeUnpaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "burnInitiated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "burnId",
            "type": "u64"
          },
          {
            "name": "solanaSender",
            "type": "pubkey"
          },
          {
            "name": "mirageRecipient",
            "type": "string"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "burnParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mirageRecipient",
            "type": "string"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "burnRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "burnId",
            "type": "u64"
          },
          {
            "name": "solanaSender",
            "type": "pubkey"
          },
          {
            "name": "mirageRecipient",
            "type": "string"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "initializeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mirageChainId",
            "type": "string"
          },
          {
            "name": "attestationThreshold",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "mintAttested",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "burnTxHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "orchestrator",
            "type": "pubkey"
          },
          {
            "name": "currentPower",
            "type": "u64"
          },
          {
            "name": "threshold",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "mintCompleted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "burnTxHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "mintParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "burnTxHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "mirageSender",
            "type": "string"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "mintRecord",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "burnTxHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "attestations",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "attestedPower",
            "type": "u64"
          },
          {
            "name": "completed",
            "type": "bool"
          },
          {
            "name": "completedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "updateValidatorsParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "validators",
            "type": {
              "vec": {
                "defined": {
                  "name": "validatorInfo"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "validatorInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orchestratorPubkey",
            "type": "pubkey"
          },
          {
            "name": "mirageValidator",
            "type": "string"
          },
          {
            "name": "votingPower",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "validatorRegistry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "validators",
            "type": {
              "vec": {
                "defined": {
                  "name": "validatorInfo"
                }
              }
            }
          },
          {
            "name": "totalVotingPower",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
