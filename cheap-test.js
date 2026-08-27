async function test() {
  const response = await fetch(
    "https://www.cheapdatahub.ng/api/v1/resellers/airtime/purchase/",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer ff5816696636afedb53a9a280b1ca6b4551d381a",
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        provider_id: 1,
        phone_number: "08143542037",
        amount: 100
      })
    }
  );

  console.log("STATUS:", response.status);

  const text = await response.text();

  console.log("RESPONSE:", text);
}

test().catch(console.error);