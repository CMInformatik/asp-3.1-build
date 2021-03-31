const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');
const glob = require('@actions/glob');
const artifact = require('@actions/artifact');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Input variable names
const inputDockerPassword = 'docker-password';
const inputDockerUsername = 'docker-username';
const inputAppName = 'app-name';
const myGetPreAuthUrl = 'myget-pre-auth-url';
const dockerRegistry = 'registry.cmicloud.ch:4443';

let tag = '';

async function run() {
    await runStep(addNuGetConfig, 'Add NuGet config.');
    await runStep(ensureMyGetNuGetSource, 'Ensure MyGet NuGet source.');
    await runStep(setUpVersion, 'Prepare docker version.');
    await runStep(setUpDockerBuildX, 'SetUp docker buildX');
    await runStep(logInDockerRegistry, 'Login docker registry');
    await runStep(buildAndPush, 'Build and push docker container');
    await runStep(removeNuGetConfig, 'Remove NuGet config');
    await runStep(createExtractContainer, 'Create extract container');
    await runStep(extractBuildResult, 'Extract build result');
    await runStep(removeExtractContainer, 'Remove extract container');

    let installArgs = ['tool', 'install', '-g', 'nbgv'];
    await exec.exec('dotnet', installArgs);
    core.addPath(path.join(os.homedir(), '.dotnet', 'tools'));
    await exec.exec(`nbgv get-version -p ./code`);

    let versionJson = '';
    await exec.exec('nbgv get-version -p ./code', [], { listeners: { stdout: (data) => { versionJson += data.toString() } } });
    core.setOutput('versionJson', versionJson);

    // Break up the JSON into individual outputs.
    const versionProperties = JSON.parse(versionJson);
    for (let name in versionProperties.CloudBuildAllVars) {
        await exec.exec(`echo ${name}`);
        core.setOutput(name.substring(5), versionProperties.CloudBuildAllVars[name]);
    }

    // await runStep(uploadArtifacts, 'Upload artifacts');
}

async function runStep(step, displayText) {
    try {
        console.log(`${displayText} started.`);

        await step();

        console.log(`${displayText} finished.`)
    } catch (error) {
        core.setFailed(`Step "${displayText}" failed. Error: ${error.message}`);
        throw error;
    }
}

async function buildAndPush() {
    await exec.exec(`docker build code --secret id=nuget_config,src=/tmp/nuget.config -t ${tag}`);
}

async function extractBuildResult() {
    await exec.exec('docker cp extract:/app ./extracted-app');
}

async function createExtractContainer() {
    await exec.exec(`docker create --name extract "${tag}"`);
}

async function removeExtractContainer() {
    await exec.exec('docker rm extract');
}

async function logInDockerRegistry() {
    let password = core.getInput(inputDockerPassword);
    let username = core.getInput(inputDockerUsername);

    await exec.exec(`docker login ${dockerRegistry} --username "${username}" --password "${password}"`);
}

async function setUpDockerBuildX() {
    await exec.exec('docker buildx install');
}

async function setUpVersion() {
    let repositoryName = core.getInput(inputAppName).toLowerCase();
    let dockerImage = `${dockerRegistry}/${repositoryName}`;
    let version = `edge`;

    if (github.context.ref.startsWith('refs/tags')) {
        version = github.context.ref.replace('refs/tags/', '');
    } else if (github.context.ref.startsWith('refs/heads/')) {
        version = github.context.ref.replace('refs/heads/', '').replace('/', '-');
    } else if (github.context.ref.startsWith('refs/pull/')) {
        const ev = JSON.parse(
            fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')
        );

        version = `pr-${ev.pull_request.number}`;
    }

    tag = `${dockerImage}:${version}`;
}

async function removeNuGetConfig() {
    await exec.exec('rm -f /tmp/nuget.config');
}

async function addNuGetConfig() {
    await exec.exec('dotnet new nugetconfig -o /tmp');
}

async function ensureMyGetNuGetSource() {
    let myGetNuGetSource = core.getInput(myGetPreAuthUrl);
    if(myGetNuGetSource) {
        await exec.exec(`dotnet nuget add source "${myGetNuGetSource}" -n myget --configfile /tmp/nuget.config`)
    }
}

async function uploadArtifacts() {
    const globber = await glob.create('./extracted-app/**');
    const files = await globber.glob();

    await artifact.create().uploadArtifact(core.getInput(inputAppName), files, './extracted-app');
}

run().then(_ => {});
