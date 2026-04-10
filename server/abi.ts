export const lbcAbi = [
  {
    type: "event",
    name: "QuoteRequested",
    inputs: [
      { indexed: true, name: "quoteHash", type: "bytes32" },
      { indexed: true, name: "requester", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "QuoteCompleted",
    inputs: [
      { indexed: true, name: "quoteHash", type: "bytes32" },
      { indexed: true, name: "lp", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "success", type: "bool" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "DepositTransferred",
    inputs: [
      { indexed: true, name: "quoteHash", type: "bytes32" },
      { indexed: true, name: "lp", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
] as const;
