async function test(){

const response = await fetch(
"https://www.cheapdatahub.ng/api/v1/resellers/airtime/providers/",
{
headers:{
Authorization:"Bearer YOUR_API_KEY",
Accept:"application/json"
}
}
);

console.log("STATUS:", response.status);
console.log(await response.text());

}

test();