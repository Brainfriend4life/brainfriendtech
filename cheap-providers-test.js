const API_KEY = "ff5816696636afedb53a9a280b1ca6b4551d381a";

async function test(){

const response = await fetch(
"https://www.cheapdatahub.ng/api/v1/resellers/airtime/providers/",
{
headers:{
Authorization:`Bearer ${API_KEY}`,
Accept:"application/json"
}
}
);

console.log("STATUS:",response.status);
console.log(await response.text());

}

test();