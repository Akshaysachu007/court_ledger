// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

contract EvidenceStorage {

    struct Evidence {
        string fileHash;
        string cid;
        uint256 timestamp;
        uint256 blockNumber;
    }

    // Case → Evidence Timeline
    mapping(string => Evidence[]) private evidenceRecords;

    event EvidenceStored(
        string caseId,
        string fileHash,
        string cid,
        uint256 timestamp,
        uint256 blockNumber
    );

    function storeEvidence(
        string memory _caseId,
        string memory _fileHash,
        string memory _cid
    ) public {

        Evidence memory newEvidence = Evidence({
            fileHash: _fileHash,
            cid: _cid,
            timestamp: block.timestamp,
            blockNumber: block.number
        });

        evidenceRecords[_caseId].push(newEvidence);

        emit EvidenceStored(
            _caseId,
            _fileHash,
            _cid,
            block.timestamp,
            block.number
        );
    }

    function getEvidence(string memory _caseId)
        public
        view
        returns (Evidence[] memory)
    {
        return evidenceRecords[_caseId];
    }
}