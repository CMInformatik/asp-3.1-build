const core = require('@actions/core');
const github = require('@actions/github');
const exec = require('@actions/exec');

let dockerRegistry = 'registry.cmicloud.ch:4443';

async function run() {
    try {
        console.log('Setting variables');
        const myGetNuGetSource = core.getInput('myget-pre-auth-url');

        await addNugetConfig();
        await ensureMyGetNuGetSource(myGetNuGetSource);
        await prepare();
        await setUpDockerBuildX();
        await logInDockerRegistry();

    } catch (error) {
        core.setFailed(error.message);
    }
}

async function logInDockerRegistry() {
    console.log('Log in to docker registry');
    let password = core.getInput('docker-password');
    let username = core.getInput('docker-username');

    console.log(username);
    await exec.exec(`docker login ${dockerRegistry} --username "${username}" --password "${password}"`);
}

async function setUpDockerBuildX() {
    console.log('Set up docker buildx');
    await exec.exec('docker buildx install');
}

async function prepare() {
    let repositoryName = core.getInput('app-name').toLowerCase();
    let dockerImage = `${dockerRegistry}/${repositoryName}`;
    let version = 'edge';

    let tags = `-t ${dockerImage}:${version}`;
    if(github.context.eventName === 'push') {
        tags += ` -t ${dockerImage}:${github.context.sha}`;
    }


    /* TODO Version */
}

async function addNugetConfig() {
    console.log('Add nuget.config');
    await exec.exec('dotnet new nugetconfig -o /tmp');
}

async function ensureMyGetNuGetSource(myGetNuGetSource) {
    console.log('Ensure MyGet NuGet Source');
    if(myGetNuGetSource) {
        await exec.exec(`dotnet nuget add source "${myGetNuGetSource}" -n myget --configfile /tmp/nuget.config`)
    }
}

run().then(_ => {});
