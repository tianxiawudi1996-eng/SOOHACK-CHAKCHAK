export function createTutorService({repository,kernel}){
  if(!repository||!kernel)throw new Error('TUTOR_SERVICE_DEPENDENCIES_REQUIRED');
  return {
    async respond({actor,formulaSessionId,responseId,key,hash}){
      const context=await repository.getTutorFeedbackContext({actor,formulaSessionId,responseId});
      if(context.tutor_feedback)return {...context.tutor_feedback,replayed:true};
      const turn=await kernel.generate(context);
      return repository.saveTutorFeedback({actor,formulaSessionId,responseId,turn,key,hash});
    }
  };
}
