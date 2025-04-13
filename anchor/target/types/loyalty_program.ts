/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/loyalty_program.json`.
 */
export type LoyaltyProgram = {
  "address": "DG415jpPKStJC9uUb77e4UUXVnQ843P1dLB7F9v9sjSc",
  "metadata": {
    "name": "loyaltyProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "closeLoyaltyCard",
      "docs": [
        "The account will be closed automatically by Anchor.\n    No additional logic is needed here.\n    docs: https://docs.rs/anchor-lang/latest/anchor_lang/trait.AccountsClose.html"
      ],
      "discriminator": [
        196,
        13,
        190,
        119,
        37,
        169,
        177,
        38
      ],
      "accounts": [
        {
          "name": "loyaltyCard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "customer"
              },
              {
                "kind": "account",
                "path": "merchant"
              }
            ]
          }
        },
        {
          "name": "customer",
          "writable": true,
          "signer": true,
          "relations": [
            "loyaltyCard"
          ]
        },
        {
          "name": "merchant",
          "writable": true,
          "relations": [
            "loyaltyCard"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "processPayment",
      "discriminator": [
        189,
        81,
        30,
        198,
        139,
        186,
        115,
        23
      ],
      "accounts": [
        {
          "name": "loyaltyCard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  111,
                  121,
                  97,
                  108,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "customer"
              },
              {
                "kind": "account",
                "path": "merchant"
              }
            ]
          }
        },
        {
          "name": "customer",
          "writable": true
        },
        {
          "name": "merchant",
          "writable": true,
          "signer": true
        },
        {
          "name": "merchantUsdcAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "merchant"
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
                "kind": "const",
                "value": [
                  233,
                  40,
                  57,
                  85,
                  9,
                  101,
                  255,
                  212,
                  214,
                  74,
                  202,
                  175,
                  70,
                  212,
                  93,
                  247,
                  49,
                  142,
                  91,
                  79,
                  87,
                  201,
                  12,
                  72,
                  125,
                  96,
                  98,
                  93,
                  130,
                  155,
                  131,
                  123
                ]
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
          "name": "customerUsdcAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "customer"
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
                "kind": "const",
                "value": [
                  233,
                  40,
                  57,
                  85,
                  9,
                  101,
                  255,
                  212,
                  214,
                  74,
                  202,
                  175,
                  70,
                  212,
                  93,
                  247,
                  49,
                  142,
                  91,
                  79,
                  87,
                  201,
                  12,
                  72,
                  125,
                  96,
                  98,
                  93,
                  130,
                  155,
                  131,
                  123
                ]
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
          "name": "usdcAccount",
          "writable": true,
          "address": "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
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
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "mintAddress",
          "type": "pubkey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "loyaltyCard",
      "discriminator": [
        204,
        41,
        42,
        207,
        153,
        71,
        5,
        60
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "overflow",
      "msg": "Arithmetic overflow occurred."
    },
    {
      "code": 6001,
      "name": "unauthorized",
      "msg": "Only the merchant who owns this card can close it."
    }
  ],
  "types": [
    {
      "name": "loyaltyCard",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "merchant",
            "type": "pubkey"
          },
          {
            "name": "customer",
            "type": "pubkey"
          },
          {
            "name": "loyaltyPoints",
            "type": "u64"
          },
          {
            "name": "threshold",
            "type": "u64"
          },
          {
            "name": "refundPercentage",
            "type": "u8"
          },
          {
            "name": "mintAddress",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
