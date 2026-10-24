import { buildHindiWordLibraryMergeReport } from '../src/features/rounds/hindiWordLibraryInstall.js'

const report = buildHindiWordLibraryMergeReport()
console.log('Hindi Word Round library merge report')
console.log('  Original entries (batch 1 + batch 2):', report.originalEntryCount)
console.log('  Duplicate entries merged:', report.duplicateEntriesMerged)
console.log('  Final unique words:', report.finalUniqueCount)
if (report.mergedDuplicates?.length) {
  console.log('\nMerged duplicates:')
  for (const row of report.mergedDuplicates) {
    console.log(
      `  - "${row.removed?.word}" merged into "${row.kept?.word}" (key: ${row.key})`,
    )
  }
}
