/**
 * SeededRandom Determinism Demo
 *
 * This file demonstrates that the SeededRandom class produces identical
 * sequences when given the same seed, and that substreams are independent.
 */

import {
  createSeededRandomWithSubstreams,
  createSeededRandomFromString,
  seedFromObject,
  canonicalize,
} from './SeededRandom';

function runDeterminismTest(): void {
  console.log('=== SeededRandom Determinism Test ===\n');

  // Test 1: Same seed produces identical sequences
  console.log('Test 1: Same seed produces identical sequences');
  const seed1 = 12345;
  const rng1a = createSeededRandomWithSubstreams(seed1);
  const rng1b = createSeededRandomWithSubstreams(seed1);

  const values1a: number[] = [];
  const values1b: number[] = [];

  for (let i = 0; i < 10; i++) {
    values1a.push(rng1a.next());
    values1b.push(rng1b.next());
  }

  const test1Pass = values1a.every((v, i) => v === values1b[i]);
  console.log(`  Seed: ${seed1}`);
  console.log(`  Sequence A: [${values1a.map(v => v.toFixed(6)).join(', ')}]`);
  console.log(`  Sequence B: [${values1b.map(v => v.toFixed(6)).join(', ')}]`);
  console.log(`  PASS: ${test1Pass}\n`);

  // Test 2: Different seeds produce different sequences
  console.log('Test 2: Different seeds produce different sequences');
  const rng2a = createSeededRandomWithSubstreams(100);
  const rng2b = createSeededRandomWithSubstreams(200);

  const values2a = [rng2a.next(), rng2a.next(), rng2a.next()];
  const values2b = [rng2b.next(), rng2b.next(), rng2b.next()];

  const test2Pass = values2a[0] !== values2b[0] || values2a[1] !== values2b[1];
  console.log(`  Seed 100: [${values2a.map(v => v.toFixed(6)).join(', ')}]`);
  console.log(`  Seed 200: [${values2b.map(v => v.toFixed(6)).join(', ')}]`);
  console.log(`  PASS: ${test2Pass}\n`);

  // Test 3: Substreams are independent
  console.log('Test 3: Substreams are independent');
  const rng3 = createSeededRandomWithSubstreams(99999);

  // Draw from layout first
  const layoutFirst: number[] = [];
  layoutFirst.push(rng3.layout().next());
  layoutFirst.push(rng3.layout().next());

  // Draw from oranges (shouldn't affect layout)
  const orangesValues: number[] = [];
  orangesValues.push(rng3.oranges().next());
  orangesValues.push(rng3.oranges().next());

  // Draw from layout again (should continue from where it left off)
  layoutFirst.push(rng3.layout().next());

  // Now create a new instance and draw in different order
  const rng3b = createSeededRandomWithSubstreams(99999);

  // Draw from oranges first
  const orangesValuesB: number[] = [];
  orangesValuesB.push(rng3b.oranges().next());
  orangesValuesB.push(rng3b.oranges().next());

  // Draw from layout
  const layoutFirstB: number[] = [];
  layoutFirstB.push(rng3b.layout().next());
  layoutFirstB.push(rng3b.layout().next());
  layoutFirstB.push(rng3b.layout().next());

  // Oranges should be identical regardless of order
  const test3a = orangesValues.every((v, i) => v === orangesValuesB[i]);
  // Layout should be identical regardless of order
  const test3b = layoutFirst.every((v, i) => v === layoutFirstB[i]);

  console.log(`  Layout (layout first): [${layoutFirst.map(v => v.toFixed(6)).join(', ')}]`);
  console.log(`  Layout (oranges first): [${layoutFirstB.map(v => v.toFixed(6)).join(', ')}]`);
  console.log(`  Oranges values: [${orangesValues.map(v => v.toFixed(6)).join(', ')}]`);
  console.log(`  Oranges values (B): [${orangesValuesB.map(v => v.toFixed(6)).join(', ')}]`);
  console.log(`  Layout independent: ${test3b}`);
  console.log(`  Oranges independent: ${test3a}`);
  console.log(`  PASS: ${test3a && test3b}\n`);

  // Test 4: All standard methods work
  console.log('Test 4: Standard methods');
  const rng4 = createSeededRandomWithSubstreams(55555);
  console.log(`  nextInt(1, 10): ${rng4.nextInt(1, 10)}`);
  console.log(`  range(0, 1): ${rng4.range(0, 1).toFixed(6)}`);
  console.log(`  boolean: ${rng4.boolean()}`);
  console.log(`  pick([a,b,c]): ${rng4.pick(['a', 'b', 'c'])}`);
  console.log(`  shuffle([1,2,3]): [${rng4.shuffle([1, 2, 3]).join(', ')}]\n`);

  // Test 5: String seed
  console.log('Test 5: String seed');
  const rng5a = createSeededRandomFromString('my-game-seed');
  const rng5b = createSeededRandomFromString('my-game-seed');
  const values5a = [rng5a.next(), rng5a.next(), rng5a.next()];
  const values5b = [rng5b.next(), rng5b.next(), rng5b.next()];
  const test5Pass = values5a.every((v, i) => v === values5b[i]);
  console.log(`  String seed 'my-game-seed'`);
  console.log(`  Sequence: [${values5a.map(v => v.toFixed(6)).join(', ')}]`);
  console.log(`  Reproducible: ${test5Pass}\n`);

  // Test 6: Object-based seed
  console.log('Test 6: Object-based seed');
  const config = { difficulty: 5, numColors: 4, extraTubes: 2 };
  const rng6a = createSeededRandomWithSubstreams(seedFromObject(config));
  const rng6b = createSeededRandomWithSubstreams(seedFromObject(config));
  const values6a = [rng6a.layout().nextInt(0, 100), rng6a.layout().nextInt(0, 100)];
  const values6b = [rng6b.layout().nextInt(0, 100), rng6b.layout().nextInt(0, 100)];
  const test6Pass = values6a[0] === values6b[0] && values6a[1] === values6b[1];
  console.log(`  Config: ${JSON.stringify(config)}`);
  console.log(`  Derived seed: ${seedFromObject(config)}`);
  console.log(`  Values: [${values6a.join(', ')}]`);
  console.log(`  Reproducible: ${test6Pass}\n`);

  // Test 7: Canonical JSON (stable serialization)
  console.log('Test 7: Canonical JSON (stable serialization)');
  // Same data, different key order - should produce identical canonical form
  const obj1 = { z: 1, a: 2, m: [3, 1, 2] };
  const obj2 = { a: 2, m: [3, 1, 2], z: 1 };
  const can1 = canonicalize(obj1);
  const can2 = canonicalize(obj2);
  const test7Pass = can1 === can2;
  console.log(`  Object 1: ${JSON.stringify(obj1)}`);
  console.log(`  Object 2: ${JSON.stringify(obj2)}`);
  console.log(`  Canonical 1: ${can1}`);
  console.log(`  Canonical 2: ${can2}`);
  console.log(`  Equal (stable): ${test7Pass}\n`);

  // Summary
  console.log('=== Summary ===');
  const allPass = test1Pass && test2Pass && test3a && test3b && test5Pass && test6Pass && test7Pass;
  console.log(`All tests passed: ${allPass}`);
  
  if (!allPass) {
    console.log('FAILURES:');
    if (!test1Pass) console.log('  - Determinism test failed');
    if (!test2Pass) console.log('  - Different seeds test failed');
    if (!test3a || !test3b) console.log('  - Substream independence test failed');
    if (!test5Pass) console.log('  - String seed test failed');
    if (!test6Pass) console.log('  - Object seed test failed');
    if (!test7Pass) console.log('  - Canonical JSON test failed');
  }
}

// Run tests when this file is executed directly
runDeterminismTest();

export { runDeterminismTest };
