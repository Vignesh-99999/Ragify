const { spawn } = require('child_process');

exports.runPython = (script, input = '') => {
    return new Promise((resolve, reject) => {
        const process = spawn('python', [`python/${script}`]);

        let result = '';

        process.stdin.write(input);
        process.stdin.end();

        process.stdout.on('data', data => {
            result += data.toString();
        });

        process.stderr.on('data', err => {
            console.error(err.toString());
        });

        process.on('close', () => resolve(result));
    });
};