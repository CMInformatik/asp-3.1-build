const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');

// Input variable names
const inputDockerPassword = 'docker-password';
const inputDockerUsername = 'docker-username';
const inputAppName = 'app-name';
const myGetPreAuthUrl = 'myget-pre-auth-url';

// Action variables
let actionVariables = {
    tags: '',
    dockerRegistry: 'registry.cmicloud.ch:4443'
};

async function run() {
    await runStep(addNuGetConfig, 'Add NuGet config.');
    await runStep(ensureMyGetNuGetSource, 'Ensure MyGet NuGet source.');
    await runStep(prepare, 'Prepare docker variables.');
    await runStep(setUpDockerBuildX, 'SetUp docker buildX');
    await runStep(logInDockerRegistry, 'Login docker registry');
    //await runStep(buildAndPush, 'Build and push docker container');
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
    await exec.exec(`docker build code --secret id=nuget_config,src=/tmp/nuget.config ${actionVariables.tags}`);
}

async function logInDockerRegistry() {
    let password = core.getInput(inputDockerPassword);
    let username = core.getInput(inputDockerUsername);

    await exec.exec(`docker login ${actionVariables.dockerRegistry} --username "${username}" --password "${password}"`);
}

async function setUpDockerBuildX() {
    await exec.exec('docker buildx install');
}

async function prepare() {
    let repositoryName = core.getInput(inputAppName).toLowerCase();
    let dockerImage = `${actionVariables.dockerRegistry}/${repositoryName}`;
    let version = 'edge';

    actionVariables.tags = `-t ${dockerImage}:${version}`;
    if(github.context.eventName === 'push') {
        actionVariables.tags += ` -t ${dockerImage}:${github.context.sha}`;
    }

    /* TODO */
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

run().then(_ => {});
