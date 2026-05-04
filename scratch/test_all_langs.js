// using global fetch available in Node 22+

async function testLang(lang, code, input) {
  console.log(`Testing ${lang}...`);
  try {
    const res = await fetch('http://localhost:3000/code-execution/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: lang,
        code: code,
        testCases: [{ input: input, expectedOutput: 'ready' }]
      })
    });
    const data = await res.json();
    console.log(`${lang} result:`, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`${lang} failed:`, e.message);
  }
}

async function runTests() {
  // Python
  await testLang('python', "import sys\nprint('ready', end='')", 'in');
  
  // JavaScript (verified manually but let's re-test)
  await testLang('javascript', "const fs=require('fs'); process.stdout.write('ready');", 'in');

  // Java
  const javaCode = `
import java.util.*;
public class Solution {
  public static void main(String[] args) {
    System.out.print("ready");
  }
}`;
  await testLang('java', javaCode, 'in');

  // C++
  const cppCode = `
#include <iostream>
int main() {
  std::cout << "ready";
  return 0;
}`;
  await testLang('cpp', cppCode, 'in');
}

runTests();
