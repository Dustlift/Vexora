import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const root = process.cwd();
const outputDir = path.join(root, "src", "generated", "contracts");
const contracts = ["ArcErc721Collection.sol", "ArcErc1155Collection.sol"];

function findImport(importPath) {
  const candidates = [
    path.join(root, "contracts", "src", importPath),
    path.join(root, "node_modules", importPath),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { contents: fs.readFileSync(candidate, "utf8") };
    }
  }
  return { error: `File not found: ${importPath}` };
}

const sources = Object.fromEntries(
  contracts.map((file) => [
    file,
    { content: fs.readFileSync(path.join(root, "contracts", "src", file), "utf8") },
  ]),
);

const input = {
  language: "Solidity",
  sources,
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": {
        "*": ["abi", "evm.bytecode.object", "metadata"],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));
const errors = output.errors?.filter((item) => item.severity === "error") ?? [];
if (errors.length) {
  for (const error of errors) console.error(error.formattedMessage);
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
for (const [sourceFile, compiled] of Object.entries(output.contracts)) {
  for (const [contractName, artifact] of Object.entries(compiled)) {
    if (!contractName.startsWith("ArcErc")) continue;
    fs.writeFileSync(
      path.join(outputDir, `${contractName}.json`),
      JSON.stringify(
        {
          contractName,
          sourceName: sourceFile,
          compilerVersion: solc.version(),
          abi: artifact.abi,
          bytecode: `0x${artifact.evm.bytecode.object}`,
          metadata: JSON.parse(artifact.metadata),
        },
        null,
        2,
      ),
    );
  }
}

console.log(`Contract artifacts written to ${path.relative(root, outputDir)}`);
