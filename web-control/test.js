import { getJobDetails,getAuthToken,extractJobInfo,getCaseDetails } from "./getJobDetails.js";
// import { dispatchTowbook } from "./towbook-dispatch.js";
import {dispatchToTowbook} from "./towbook-dispatch.js"


const func=async () => {
    let poNumber=9044026;

    await dispatchToTowbook(9044026)


 
    // let {token, isExpired}=await getAuthToken();

    // // console.log(isExpired, token)
    // if(!isExpired){
    //     const result = await getJobDetails(poNumber,token);
    //     // console.log(extractJobInfo(result.data[0]));
    //     let job=extractJobInfo(result.data[0]);

    //     if(job.po_number){
    //         // let result2=await dispatchTowbook(job,"");
    //         // console.log(result2);
    //         if(!job.drop_off){
    //            let caseDetails= await getCaseDetails(job.caseDTO,token)
    //            let dropoff_address=caseDetails?.jobs[0]?.dropOffLocation?.address
    //            if(dropoff_address){
    //             job.drop_off=dropoff_address
    //            }
    //         }
    //     }

    //     console.log(job)
    // }
    

 
}

func();



