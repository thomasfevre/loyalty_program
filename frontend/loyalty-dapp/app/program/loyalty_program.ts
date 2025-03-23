/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/loyalty_program.json`.
 */
export type LoyaltyProgram = {
  "address": "CXccEo3Qk7j67C3KHUD1zmLsyFk4UEXJzFefPKaV7577",
  "metadata": {
    "name": "loyaltyProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
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
          "name": "merchant",
          "writable": true,
          "signer": true
        },
        {
          "name": "customer",
          "writable": true
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
