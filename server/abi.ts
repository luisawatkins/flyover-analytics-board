export const pegOutDepositEvent =
  "event PegOutDeposit(bytes32 indexed quoteHash, address indexed sender, uint256 amount, uint256 timestamp)";

export const callForUserEvent =
  "event CallForUser(address indexed from, address indexed dest, uint256 gasLimit, uint256 value, bytes data, bool success, bytes32 quoteHash)";

export const pegInRegisteredEvent =
  "event PegInRegistered(bytes32 indexed quoteHash, int256 transferredAmount)";
